/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getIncidentSocket } from "../lib/socket.js";

/** @typedef {{ apiName: string; latencyMs: number; success: boolean; result?: unknown }} ApiCallEvt */

/**
 * Per-incident realtime overlay merged on top of REST.
 * @typedef {{
 *   apiCalls: ApiCallEvt[];
 *   agentPlan?: { availableTools: string[] };
 *   ves?: { score: number; tier: string; breakdown: unknown; status: string };
 *   triage?: unknown;
 *   agentReasoning?: { reasoning: string; toolsCalledCount: number };
 *   statusOverride?: string;
 *   scoring?: boolean;
 * }} LiveOverlay */

/** @typedef {Record<string, LiveOverlay>} LiveMap */

/** @typedef {import("react").ReactNode} ReactNode */

const emptyOverlay = () => /** @type {LiveOverlay} */ ({ apiCalls: [] });

const Ctx = createContext(
  /** @type {{ overlays: LiveMap }} */ (/** @type {unknown} */ (null)),
);

/** @param {ReactNode} children */
export function IncidentLiveProvider({ children }) {
  const [overlays, setOverlays] = useState(/** @type {LiveMap} */ ({}));

  const patchOverlay = useCallback((incidentId, fn) => {
    setOverlays((prev) => {
      const base = prev[incidentId] || emptyOverlay();
      const nextOverlay = fn(base);
      return { ...prev, [incidentId]: nextOverlay };
    });
  }, []);

  useEffect(() => {
    const s = getIncidentSocket();
    if (!s.connected) s.connect();

    const patch = patchOverlay;

    const onApiCall = /** @type {(payload: Record<string, unknown>) => void} */ ((payload) => {
      const incidentId = String(payload?.incidentId ?? "");
      if (!incidentId) return;
      const apiName = String(payload?.apiName ?? "");
      const latencyMs = Number(payload?.latencyMs ?? 0);
      const success = Boolean(payload?.success);
      const result = payload?.result;
      patch(incidentId, (cur) => ({
        ...cur,
        apiCalls: [...cur.apiCalls, { apiName, latencyMs, success, result }],
      }));
    });
    /** @type {(payload: Record<string, unknown>) => void} */
    const onAgentPlan = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      const availableTools =
        payload.availableTools && Array.isArray(payload.availableTools)
          ? /** @type {string[]} */ (payload.availableTools)
          : [];
      patch(incidentId, (cur) => ({ ...cur, agentPlan: { availableTools } }));
    };

    /** @type {(payload: Record<string, unknown>) => void} */
    const onVes = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      patch(incidentId, (cur) => ({
        ...cur,
        scoring: false,
        statusOverride: String(payload.status ?? cur.statusOverride ?? ""),
        ves: {
          score: Number(payload.score ?? 0),
          tier: String(payload.tier ?? ""),
          breakdown: payload.breakdown,
          status: String(payload.status ?? ""),
        },
      }));
    };

    /** @type {(payload: Record<string, unknown>) => void} */
    const onTriage = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      patch(incidentId, (cur) => ({
        ...cur,
        triage: {
          triage: payload.triage,
          tier: payload.tier,
          score: payload.score,
          error: payload.error,
        },
      }));
    };

    /** @type {(payload: Record<string, unknown>) => void} */
    const onReasoning = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      patch(incidentId, (cur) => ({
        ...cur,
        agentReasoning: {
          reasoning: String(payload.reasoning ?? ""),
          toolsCalledCount: Number(payload.toolsCalledCount ?? 0),
        },
      }));
    };

    /** @type {(payload: Record<string, unknown>) => void} */
    const onScoringStarted = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      patch(incidentId, (cur) => ({
        ...cur,
        scoring: true,
        statusOverride: "SCORING",
      }));
    };

    /** @type {(payload: Record<string, unknown>) => void} */
    const onStatus = (payload) => {
      const incidentId = String(payload.incidentId || "");
      if (!incidentId) return;
      const status = String(payload.status ?? "");
      patch(incidentId, (cur) => ({
        ...cur,
        statusOverride: status || cur.statusOverride,
      }));
    };

    /** @typedef {{incidentId?:string}&Record<string,unknown>} IncidentWsPayload */

    /** @type {(name: string, handler: (...args: unknown[]) => void) => void} */
    const listen = (name, handler) => {
      /** @type { (...args: unknown[]) => void} */
      const h = (...args) => {
        handler(/** @type {IncidentWsPayload} */ (args[0]));
      };
      s.on(name, h);
      return () => s.off(name, h);
    };

    const off = [
      listen("incident:scoring-started", onScoringStarted),
      listen("incident:api-call", onApiCall),
      listen("incident:agent-tool-plan", onAgentPlan),
      listen("incident:ves-complete", onVes),
      listen("incident:triage-complete", onTriage),
      listen("incident:agent-reasoning", onReasoning),
      listen("incident:status-changed", onStatus),
    ];

    return () => {
      off.forEach((fn) => fn());
    };
  }, [patchOverlay]);

  const value = useMemo(() => ({ overlays }), [overlays]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIncidentLive() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIncidentLive requires IncidentLiveProvider");
  return v;
}
