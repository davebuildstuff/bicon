import { useState } from "react";
import { ApiError, simulate } from "../lib/api.js";

const SCENARIOS = [
  { id: "road-accident", label: "Road accident", tone: "text-red-200" },
  { id: "flood", label: "Network flood surge", tone: "text-blue-200" },
  { id: "stampede", label: "Stampede geo risk", tone: "text-amber-200" },
  { id: "fraud-false-alarm", label: "Fraud SIM-swap dismissal", tone: "text-purple-200" },
  { id: "ussd-trigger", label: "USSD human escalation", tone: "text-emerald-200" },
];

export default function SimulatePage() {
  const [version, setVersion] = useState(/** @type {"v1"|"v2"|"none"} */ ("none"));
  const [busy, setBusy] = useState("");
  const [payload, setPayload] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [err, setErr] = useState("");

  async function fireScenario(id) {
    setErr("");
    setBusy(id);
    setPayload(null);
    try {
      const bodyOpt =
        version === "none" ? undefined : /** @type {{ version?: string }} */ ({ version });
      const resp = /** @type {Record<string, unknown>} */ (
        /** @type {unknown} */ (await simulate(id, bodyOpt))
      );
      setPayload(resp);
    } catch (e) {
      setPayload(null);
      setErr(e instanceof ApiError ? e.message : "Simulation failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Hackathon demos</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Each POST is <code className="text-xs text-grn">202 Accepted</code> with a plain JSON body —
          observe WebSocket choreography on the dashboard while jobs flow through queues.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="text-sm font-semibold text-white">Pipeline version</div>
        <p className="mt-2 text-xs text-zinc-500">
          Omit the body entirely for <span className="font-mono text-zinc-300">v1</span>; pick{" "}
          <span className="font-mono text-zinc-300">v2</span> for agentic routing.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {[
            ["none", "Backend default"],
            ["v1", "v1 parallel CAMARA blast"],
            ["v2", "v2 agent + tools"],
          ].map(([id, title]) => (
            <label key={String(id)} className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="pipver"
                value={String(id)}
                checked={version === /** @type {"v1"|"v2"|"none"} */ (id)}
                onChange={() => setVersion(/** @type {"v1"|"v2"|"none"} */ (id))}
                className="accent-grn"
              />
              <span className="text-zinc-200">{title}</span>
            </label>
          ))}
        </div>
      </section>

      {err ? (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-100 ring-1 ring-red-500/30">
          {err}
        </div>
      ) : null}

      {payload ? (
        <section className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.08] px-5 py-4 text-sm text-emerald-50 ring-1 ring-emerald-500/35">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">
            Raw accepted payload
          </div>
          <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap break-all text-xs leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            disabled={busy === scenario.id && busy !== ""}
            onClick={() => void fireScenario(scenario.id)}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/70 to-black/30 px-5 py-4 text-left text-sm font-semibold text-white ring-1 ring-white/[0.04] transition hover:border-emerald-500/35 hover:bg-emerald-500/5 disabled:opacity-60"
          >
            <div className="flex flex-col gap-3">
              <div className={scenario.tone}>{scenario.label}</div>
              <div className="text-[11px] font-normal text-zinc-500">
                <code>{`POST /simulate/${scenario.id}`}</code>
              </div>
              <div className="text-xs font-semibold text-emerald-300">
                {busy === scenario.id ? "Scheduling job…" : "Trigger"}
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
