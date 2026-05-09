import { Link } from "react-router-dom";
import { useState } from "react";
import { Activity, AlarmClock } from "lucide-react";
import { api } from "../lib/api.js";
import { tierTone, canDispatch, canDismiss, canResolve } from "../lib/incidentUi.js";
import { displayIncident } from "./IncidentHelpers.jsx";

/** @typedef {Record<string, unknown>} Incident */

/** @param {{ incident: Incident; overlay?: Record<string, unknown>; onDone: () => void }} props */
export default function IncidentFeedCard({ incident, overlay, onDone }) {
  const id = String(incident._id ?? "");
  const d = displayIncident(incident, overlay);
  const tone = tierTone(d.vesTier || "DISMISSED");
  const scoring = overlay && overlay.scoring === true;
  const apiRows = getApiRows(overlay);
  const plannedTools = getPlannedTools(overlay);

  const elapsed = relativeTime(typeof incident.createdAt === "string" ? incident.createdAt : "");

  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone="stone">{String(incident.source ?? "?")}</Badge>
            <Badge tone="zinc">{String(incident.type ?? "?")}</Badge>
            <Badge tone="blue">{d.status || "—"}</Badge>
            {scoring ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200 ring-1 ring-amber-500/40">
                <Activity className="h-3 w-3 animate-pulse" aria-hidden />
                Scoring…
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <span className="font-mono text-xs text-zinc-400">
              {incident.phoneNumber ? String(incident.phoneNumber) : "—"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <AlarmClock className="h-3.5 w-3.5" aria-hidden />
              {elapsed}
            </span>
          </div>
          {d.summary ? (
            <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{d.summary}</p>
          ) : null}
          {plannedTools.length ? <AgentPlan tools={plannedTools} /> : null}
          {scoring || apiRows.length ? <LiveApiLog rows={apiRows} scoring={scoring} /> : null}
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-44">
          <div
            className={`rounded-xl border px-3 py-2 ring-1 ${tone.border} ${tone.bg}`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              VES
            </div>
            <div className={`text-3xl font-semibold tabular-nums ${tone.fg}`}>
              {typeof d.vesScore === "number" ? d.vesScore : "…"}
            </div>
            {d.vesTier ? (
              <div className={`mt-1 text-xs font-medium ${tone.fg}`}>{d.vesTier}</div>
            ) : (
              <div className="mt-1 text-xs text-zinc-500">tier pending</div>
            )}
            <meter
              aria-label="VES score gauge"
              className={`mt-2 h-2 w-full overflow-hidden rounded ${tone.bg}`}
              min={0}
              max={100}
              optimum={99}
              value={typeof d.vesScore === "number" ? d.vesScore : 0}
            />
          </div>
          <Link
            to={`/incidents/${id}`}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center text-xs font-medium transition hover:bg-white/10"
          >
            Full detail
          </Link>
          <ActionRow id={id} status={d.status} onDone={onDone} />
        </div>
      </div>
    </article>
  );
}

/** @param {{ id: string; status: string; onDone: () => void }} p */
function ActionRow({ id, status, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function dispatch() {
    await run(() =>
      api(`/incidents/${encodeURIComponent(id)}/dispatch`, { method: "POST" }),
    );
  }
  async function dismiss() {
    await run(() =>
      api(`/incidents/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
    );
  }
  async function resolve() {
    await run(() =>
      api(`/incidents/${encodeURIComponent(id)}/resolve`, { method: "POST" }),
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {canDispatch(status) ? (
        <MiniBtn loading={busy} onClick={() => void dispatch()} variant="accent">
          Dispatch
        </MiniBtn>
      ) : null}
      {canDismiss(status) ? (
        <MiniBtn loading={busy} onClick={() => void dismiss()} variant="neutral">
          Dismiss
        </MiniBtn>
      ) : null}
      {canResolve(status) ? (
        <MiniBtn loading={busy} onClick={() => void resolve()} variant="accent">
          Resolve
        </MiniBtn>
      ) : null}
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}

/** @param {Record<string, unknown>|undefined} overlay */
function getApiRows(overlay) {
  if (!overlay?.apiCalls || !Array.isArray(overlay.apiCalls)) return [];
  return overlay.apiCalls
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      apiName: String(entry.apiName ?? ""),
      latencyMs: Number(entry.latencyMs ?? 0),
      success: Boolean(entry.success),
    }));
}

/** @param {{ rows: { apiName: string; latencyMs: number; success: boolean }[]; scoring: boolean }} props */
function LiveApiLog({ rows, scoring }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/25">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Live telecom checks
        </div>
        {scoring ? <div className="text-[10px] text-amber-200">streaming…</div> : null}
      </div>
      <table className="w-full text-left text-[11px] text-zinc-300">
        <thead className="bg-white/[0.03] text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-medium">API</th>
            <th className="px-3 py-2 font-medium">Latency</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row.apiName}-${row.latencyMs}-${index}`} className="border-t border-white/5">
                <td className="px-3 py-2 font-mono text-emerald-200">{row.apiName}</td>
                <td className="px-3 py-2">{row.latencyMs}ms</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                      row.success
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/35"
                        : "bg-red-500/15 text-red-200 ring-red-500/35"
                    }`}
                  >
                    {row.success ? "PASS" : "FAIL"}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-t border-white/5">
              <td colSpan={3} className="px-3 py-3 text-zinc-500">
                Waiting for API call events.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** @param {Record<string, unknown>|undefined} overlay */
function getPlannedTools(overlay) {
  if (!overlay?.agentPlan || typeof overlay.agentPlan !== "object") return [];
  const availableTools = overlay.agentPlan.availableTools;
  return Array.isArray(availableTools)
    ? availableTools.map((tool) => String(tool)).filter(Boolean)
    : [];
}

/** @param {{ tools: string[] }} props */
function AgentPlan({ tools }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
        Agent planning
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tools.map((tool) => (
          <span
            key={tool}
            className="rounded-md bg-black/30 px-2 py-1 font-mono text-[10px] text-emerald-100 ring-1 ring-emerald-500/20"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}

/** @param {{ children: React.ReactNode; tone?: string }} props */
function Badge({ children, tone = "stone" }) {
  const tones = {
    stone: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    zinc: "bg-zinc-800/70 text-zinc-200 ring-zinc-600/60",
    blue: "bg-sky-500/15 text-sky-200 ring-sky-500/35",
  };
  /** @type {keyof typeof tones} */
  const k = tone in tones ? /** @type {keyof typeof tones} */ (tone) : "stone";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[k]}`}
    >
      {children}
    </span>
  );
}

/** @param {{ loading?: boolean; variant?: string; children: React.ReactNode; onClick?: ()=>void }} p */
function MiniBtn({ children, loading, variant = "neutral", onClick }) {
  const v =
    variant === "accent"
      ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 ring-emerald-500/40"
      : "bg-white/5 text-zinc-200 hover:bg-white/10 ring-white/15";
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-50 ${v}`}
    >
      {loading ? "…" : children}
    </button>
  );
}

/** @param {string} iso */
function relativeTime(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
