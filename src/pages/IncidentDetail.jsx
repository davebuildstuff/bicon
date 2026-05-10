import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ApiError, api } from "../lib/api.js";
import {
  tierTone,
  canDispatch,
  canDismiss,
  canResolve,
} from "../lib/incidentUi.js";
import { useIncidentLive } from "../context/IncidentLiveContext.jsx";
import { displayIncident } from "../components/IncidentHelpers.jsx";

/** @typedef {Record<string, unknown>} Incident */

/** @param {Record<string, unknown>} triage */
function TriagePanels({ incident, overlay, triage }) {
  const env =
    overlay.triage && typeof overlay.triage === "object"
      ? /** @type {{ error?: unknown; triage?: unknown }} */ (overlay.triage)
      : null;
  const errFlag = Boolean(env && env.error === true);

  if (!triage && incident.triageError) {
    return <p className="mt-3 text-xs text-red-200">{String(incident.triageError)}</p>;
  }
  if (!triage && errFlag) {
    return <p className="mt-3 text-xs text-red-300">Triage unavailable due to an upstream error.</p>;
  }
  if (!triage && !incident.triageError) {
    return (
      <p className="mt-3 text-xs text-zinc-400">
        Triage still running or unavailable for this tier / pipeline stage.
      </p>
    );
  }
  if (!triage) return null;

  /** @typedef {{severity?: string; escalationRisk?: number; incidentType?: string; summary?: string; recommendedAction?: string; confidenceNote?: string}} Tshape */
  const t = /** @type {Tshape} */ (triage);

  return (
    <div className="mt-3 space-y-3 text-xs text-purple-50/95">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Severity</div>
        <div className="mt-1 text-sm text-purple-50">{t.severity ?? "—"}</div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Incident type</div>
        <div className="mt-1 text-sm text-purple-50">{t.incidentType ?? "—"}</div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Escalation risk
        </div>
        <progress className="mt-1 h-2 w-full accent-purple-400" value={t.escalationRisk ?? 0} max={100} />
      </div>
      {t.summary ? (
        <div className="rounded-xl bg-black/35 p-3 ring-1 ring-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Dispatcher summary
          </div>
          <p className="mt-1 text-[13px] leading-relaxed">{t.summary}</p>
        </div>
      ) : null}
      {t.recommendedAction ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Recommended action
          </div>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-amber-50">
            {t.recommendedAction}
          </p>
        </div>
      ) : null}
      {t.confidenceNote ? (
        <div className="rounded-xl bg-black/35 p-3 ring-1 ring-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Confidence note
          </div>
          <p className="mt-1 text-[13px] leading-relaxed">{t.confidenceNote}</p>
        </div>
      ) : null}
      {errFlag ? <p className="text-xs text-red-300">Triage reported an upstream error flag.</p> : null}
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id = "" } = useParams();
  const { overlays } = useIncidentLive();
  const overlay = /** @type {Record<string, unknown>} */ (
    overlays[id] ? overlays[id] : {}
  );

  const [incident, setIncident] = useState(/** @type {Incident|null} */ (null));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");
  const [openReasoning, setOpenReasoning] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setErr("");
      const row = /** @type {Incident} */ (await api(`/incidents/${encodeURIComponent(id)}`));
      setIncident(row);
    } catch (e) {
      const ae = e instanceof ApiError ? e : null;
      setErr(ae?.message ?? "Unable to load incident");
      setIncident(null);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const t = window.setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  if (!id) {
    return (
      <div className="text-sm text-zinc-500">
        Missing id —{" "}
        <Link className="text-emerald-400" to="/dashboard">
          return
        </Link>
        .
      </div>
    );
  }

  const is404 = Boolean(err && (/\b404\b/.test(err) || /\bnot found\b/i.test(err)));

  if (is404) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/30 p-10 text-center text-sm text-zinc-400">
        Incident not found
        <div className="mt-6">
          <Link className="text-emerald-400 hover:text-emerald-300" to="/dashboard">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const d = displayIncident(incident ?? undefined, overlay);
  const tone = tierTone(String(d.vesTier || "DISMISSED"));

  const breakdownSrc =
    d.overlay?.ves && typeof d.overlay.ves === "object" && "breakdown" in d.overlay.ves
      ? /** @type {{ breakdown?: unknown }} */ (d.overlay.ves).breakdown
      : incident?.vesBreakdown;

  const vesBreakdownEntries =
    breakdownSrc &&
    typeof breakdownSrc === "object" &&
    !Array.isArray(breakdownSrc)
      ? Object.entries(/** @type {Record<string, unknown>} */ (breakdownSrc))
      : [];

  /** @typedef {{ apiName: string; latencyMs: number; success: boolean; result?: unknown }} ApiRow */

  /** @returns {ApiRow[]} */
  function mergedApiRows(i, ov) {
    const fromRest =
      i?.vesApiResults && Array.isArray(i.vesApiResults)
        ? i.vesApiResults.map((r) =>
            typeof r === "object" && r
              ? {
                  apiName: String(r.apiName ?? ""),
                  latencyMs: Number(r.latencyMs ?? 0),
                  success: Boolean(r.success),
                  result: r.result,
                }
              : { apiName: "", latencyMs: 0, success: false },
          )
        : [];
    /** @type {Map<string, ApiRow>} */
    const deduped = new Map();
    fromRest.forEach((row) => {
      deduped.set(apiRowKey(row), row);
    });
    if (ov.apiCalls && Array.isArray(ov.apiCalls)) {
      ov.apiCalls.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const row = {
          apiName: String(entry.apiName ?? ""),
          latencyMs: Number(entry.latencyMs ?? 0),
          success: Boolean(entry.success),
          result: entry.result,
        };
        deduped.set(apiRowKey(row), row);
      });
    }
    return [...deduped.values()];
  }

  const apiRowsLive = mergedApiRows(incident ?? null, overlay);

  const triageFromOverlayPayload =
    overlay.triage &&
    typeof overlay.triage === "object" &&
    "triage" in overlay.triage &&
    overlay.triage.triage !== undefined
      ? overlay.triage.triage
      : null;

  const triage = triageFromOverlayPayload ?? incident?.triage ?? null;

  /** @typedef {{ availableTools?: string[] }} AgentPlanLike */
  const agentPlan =
    overlay.agentPlan && typeof overlay.agentPlan === "object"
      ? /** @type {AgentPlanLike} */ (overlay.agentPlan)
      : {};

  /** @typedef {{ reasoning?: string; toolsCalledCount?: number }} ReasonLike */
  const agentReasonOv =
    overlay.agentReasoning && typeof overlay.agentReasoning === "object"
      ? /** @type {ReasonLike} */ (overlay.agentReasoning)
      : {};

  const reasoningText =
    typeof agentReasonOv.reasoning === "string" ? agentReasonOv.reasoning : undefined;
  const reasoningFromInc =
    typeof incident?.agentReasoning === "string" ? incident.agentReasoning : undefined;

  async function mutate(path) {
    setBusy(true);
    setActionErr("");
    try {
      await api(`/incidents/${encodeURIComponent(id)}${path}`, { method: "POST" });
      await load();
    } catch (error) {
      setActionErr(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Incident detail</h1>
          <p className="mt-2 font-mono text-xs text-zinc-500">{id}</p>
        </div>
      </div>

      {!incident && !err ? <div className="text-sm text-zinc-500">Loading…</div> : null}

      {err && !incident ? (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/30">
          {err}
        </div>
      ) : null}

      {incident ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <Chip>{String(incident.source ?? "?")}</Chip>
              <Chip>{String(incident.type ?? "?")}</Chip>
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold tracking-normal normal-case text-emerald-200 ring-1 ring-emerald-500/30">
                {d.status || "—"}
              </span>
              <Chip subtle>
                Pipeline {incident.pipelineVersion ? String(incident.pipelineVersion) : "?"}
              </Chip>
              {overlay.scoring === true ? (
                <span className="rounded-md bg-amber-500/15 px-2 py-1 font-semibold tracking-normal normal-case text-amber-200 ring-1 ring-amber-500/30">
                  Scoring running…
                </span>
              ) : null}
            </div>

            {agentPlan.availableTools?.length ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-zinc-200">Agent tooling plan</div>
                <p className="mt-1 text-xs text-zinc-500">
                  MCP tools Claude can probe (shows right after scoring starts in v2).
                </p>
                <ul className="mt-3 flex flex-wrap gap-2 text-xs font-mono text-emerald-200">
                  {agentPlan.availableTools.map((tool) => (
                    <li
                      key={tool}
                      className="rounded-md bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-500/35"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={`rounded-2xl border px-6 py-5 ring-1 ${tone.border} ${tone.bg}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Vulnerability / escalation score (VES)
              </div>
              <div className={`mt-3 text-5xl font-semibold tabular-nums ${tone.fg}`}>
                {typeof d.vesScore === "number" ? d.vesScore : "—"}
              </div>
              <div className={`mt-1 text-xs font-semibold ${tone.fg}`}>
                Tier {String(d.vesTier ?? "?")}
              </div>
              <meter
                className="mt-3 h-2 w-full max-w-md accent-emerald-300"
                aria-label="VES"
                min={0}
                max={100}
                value={typeof d.vesScore === "number" ? d.vesScore : 0}
              />
            </div>

            {vesBreakdownEntries.length ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  VES breakdown
                </div>
                <div className="divide-y divide-white/10 bg-black/20">
                  {vesBreakdownEntries.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,220px)_1fr] gap-3 px-4 py-2 text-xs">
                      <div className="font-mono text-zinc-300">{k}</div>
                      <div className="font-mono text-zinc-500">
                        <pre className="whitespace-pre-wrap break-all text-[11px]">
                          {JSON.stringify(v)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-sm font-semibold text-zinc-200">API call log</div>
              <table className="mt-4 w-full text-left text-[11px] text-zinc-300">
                <thead className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">API</th>
                    <th className="pb-2 pr-3 font-medium">Latency</th>
                    <th className="pb-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRowsLive.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-xs text-zinc-600">
                        Waiting for telecom checks — subscribe to websocket events during scoring for the live
                        demo.
                      </td>
                    </tr>
                  ) : (
                    apiRowsLive.map((row, i) => (
                      <tr key={`${row.apiName}-${row.latencyMs}-${i}`} className="border-t border-white/5">
                        <td className="py-2 pr-3 align-top font-mono text-emerald-200">{row.apiName}</td>
                        <td className="py-2 pr-3 align-top">{row.latencyMs}ms</td>
                        <td className="py-2 align-top">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              row.success
                                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35"
                                : "bg-red-500/15 text-red-200 ring-1 ring-red-400/35"
                            }`}
                          >
                            {row.success ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-950/40 to-black/40 p-4">
              <div className="text-sm font-semibold text-purple-50">Claude triage</div>
              <TriagePanels incident={incident} overlay={overlay} triage={triage} />
            </div>

            {reasoningText || reasoningFromInc ? (
              <div className="rounded-2xl border border-white/10 bg-black/30">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white"
                  onClick={() => setOpenReasoning((x) => !x)}
                  aria-expanded={openReasoning}
                >
                  <span className="inline-flex items-center gap-2">
                    {openReasoning ? (
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    )}
                    Agent reasoning (v2)
                  </span>
                  {typeof incident.toolsCalledCount === "number" ||
                  typeof agentReasonOv.toolsCalledCount === "number" ? (
                    <span className="text-[11px] font-normal text-zinc-400">
                      {typeof incident.toolsCalledCount === "number"
                        ? incident.toolsCalledCount
                        : agentReasonOv.toolsCalledCount}{" "}
                      tools
                    </span>
                  ) : null}
                </button>
                {openReasoning ? (
                  <div className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-zinc-300">
                    {String(reasoningText ?? reasoningFromInc ?? "")}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs">
              <DetailRow label="Phone" value={incident.phoneNumber ? String(incident.phoneNumber) : "—"} />
              <DetailRow label="Zone" value={incident.zoneId ? String(incident.zoneId) : "—"} />
              <DetailRow label="Coordinates" value={coords(incident)} />
              <DetailRow label="Scored at" value={fmt(/** @type {string|undefined} */ (incident.scoredAt))} />
              <DetailRow label="Triaged at" value={fmt(/** @type {string|undefined} */ (incident.triagedAt))} />
              <DetailRow label="Created at" value={fmt(String(incident.createdAt ?? ""))} />
              <DetailRow label="Updated at" value={fmt(String(incident.updatedAt ?? ""))} />
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4">
              {canDispatch(d.status) ? (
                <ActionBtn label="Dispatch responders" busy={busy} onClick={() => void mutate("/dispatch")} />
              ) : null}
              {canDismiss(d.status) ? (
                <ActionBtn
                  label="Dismiss incident"
                  busy={busy}
                  variant="ghost"
                  onClick={() => void mutate("/dismiss")}
                />
              ) : null}
              {canResolve(d.status) ? (
                <ActionBtn label="Mark resolved" busy={busy} onClick={() => void mutate("/resolve")} />
              ) : null}
              {actionErr ? <p className="text-xs text-red-300">{actionErr}</p> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

/** @param {{ children: import("react").ReactNode; subtle?: boolean }} p */
function Chip({ children, subtle }) {
  return (
    <span
      className={
        subtle
          ? "rounded-md bg-white/5 px-2 py-1 text-[11px] font-semibold tracking-normal normal-case text-zinc-200 ring-1 ring-white/10"
          : "rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold tracking-normal normal-case text-zinc-50"
      }
    >
      {children}
    </span>
  );
}

/** @param {{ label: string; value: string }} p */
function DetailRow({ label, value }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="min-w-0 break-all font-mono text-[11px] text-zinc-300">{value}</div>
    </div>
  );
}

/** @param {{ label: string; onClick?: () => void; busy?: boolean; variant?: string }} p */
function ActionBtn({ label, onClick, busy, variant = "solid" }) {
  const cls =
    variant === "ghost"
      ? "border-white/15 bg-transparent text-white hover:bg-white/5"
      : "bg-grn text-black hover:bg-emerald-300";
  return (
    <button
      type="button"
      disabled={busy}
      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ring-1 ring-white/10 ${cls}`}
      onClick={onClick}
    >
      {busy ? "…" : label}
    </button>
  );
}

/** @param {string | undefined} iso */
function fmt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "—";
  }
}

/** @param {Record<string, unknown>} inc */
function coords(inc) {
  const c = inc.coordinates;
  if (c && typeof c === "object" && "lat" in c && "lng" in c) {
    const p = /** @type {{ lat: number; lng: number }} */ (c);
    return `${p.lat}, ${p.lng}`;
  }
  return "—";
}

/** @param {{ apiName: string; latencyMs: number; success: boolean; result?: unknown }} row */
function apiRowKey(row) {
  return [row.apiName, row.latencyMs, row.success ? "1" : "0", safeJson(row.result)].join("|");
}

/** @param {unknown} value */
function safeJson(value) {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
