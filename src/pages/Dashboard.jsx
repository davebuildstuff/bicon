import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Activity, Cpu, ShieldAlert, Users as UsersIcon, WifiOff } from "lucide-react";
import { api, ApiError, fetchHealth } from "../lib/api.js";
import { getIncidentSocket } from "../lib/socket.js";
import { useIncidentLive } from "../context/IncidentLiveContext.jsx";
import IncidentFeedCard from "../components/IncidentFeedCard.jsx";

const BiconMap = lazy(() => import("../components/BiconMap.jsx"));

/** @typedef {Record<string, unknown>} Incident */

/** @returns {{ data: Incident[]; pagination: { total: number }}} */
function assertList(data) {
  if (data && typeof data === "object" && Array.isArray(/** @type {{data?:unknown}} */ (data).data)) {
    const d = /** @type {{data: Incident[]; pagination: { total: number }}} */ (data);
    return {
      data: d.data,
      pagination: d.pagination ?? { total: d.data.length },
    };
  }
  return { data: [], pagination: { total: 0 } };
}

function utcMidnightIso() {
  const d = new Date();
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(t).toISOString();
}

export default function DashboardPage() {
  const [health, setHealth] = useState(
    /** @type {{ ok: boolean; mongo?: string; redis?: string; message?: string }} */ ({
      ok: true,
    }),
  );
  const [kpi, setKpi] = useState({
    active: 0,
    critical: 0,
    dispatchedToday: 0,
    verifiedWardens: 0,
  });
  /** @type {[Incident[], React.Dispatch<React.SetStateAction<Incident[]>>]} */
  const [rows, setRows] = useState(/** @type {Incident[]} */ ([]));
  const [listErr, setListErr] = useState("");
  const [zones, setZones] = useState(/** @type {Record<string,unknown>[]} */ ([]));
  const { overlays } = useIncidentLive();

  const loadZones = useCallback(async () => {
    try {
      const data = await api("/zones");
      setZones(Array.isArray(data) ? /** @type {Record<string,unknown>[]} */ (data) : []);
    } catch {
      /* non-critical — map still renders without zones */
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      setListErr("");
      const raw = await api("/incidents?limit=20");
      const { data } = assertList(raw);
      setRows((prev) => mergeIncidentRows(data, prev));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load incidents";
      setListErr(msg);
    }
  }, []);

  const refreshKpis = useCallback(async () => {
    const from = utcMidnightIso();
    try {
      const [watchP, highP, critStat, criticalTierP, dispatchedP, verifiedP] =
        await Promise.all([
          api(`/incidents?status=WATCH&limit=1`).catch(() => ({
            pagination: { total: 0 },
          })),
          api(`/incidents?status=HIGH&limit=1`).catch(() => ({
            pagination: { total: 0 },
          })),
          api(`/incidents?status=CRITICAL&limit=1`).catch(() => ({
            pagination: { total: 0 },
          })),
          api(`/incidents?tier=CRITICAL&limit=1`).catch(() => ({
            pagination: { total: 0 },
          })),
          api(`/incidents?status=DISPATCHED&limit=1&from=${encodeURIComponent(from)}`).catch(
            () => ({ pagination: { total: 0 } }),
          ),
          api(`/wardens?status=VERIFIED&limit=1`).catch(() => ({
            pagination: { total: 0 },
          })),
        ]);

      const w = /** @type {{ pagination?: { total: number }}} */ (watchP);
      const h = /** @type {{ pagination?: { total: number }}} */ (highP);
      const cs = /** @type {{ pagination?: { total: number }}} */ (critStat);
      const ct = /** @type {{ pagination?: { total: number }}} */ (criticalTierP);

      /** Status CRITICAL incidents + status HIGH incidents already counted separately for "active" */
      const active =
        Number(w.pagination?.total ?? 0) +
        Number(h.pagination?.total ?? 0) +
        Number(cs.pagination?.total ?? 0);
      /** Spec: "Critical now" uses tier=CRITICAL total */
      const critical = Number(ct.pagination?.total ?? 0);
      const dispatchedToday = Number(
        /** @type {{ pagination?: { total: number }}} */ (dispatchedP).pagination?.total ?? 0,
      );
      const verifiedWardens = Number(
        /** @type {{ pagination?: { total: number }}} */ (verifiedP).pagination?.total ?? 0,
      );

      setKpi({
        active,
        critical,
        dispatchedToday,
        verifiedWardens,
      });
    } catch {
      /** individual catches above */
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    const { ok, body } = await fetchHealth();
    const b =
      body && typeof body === "object" ? /** @type {Record<string, unknown>} */ (body) : {};
    setHealth({
      ok,
      mongo: typeof b.mongo === "string" ? b.mongo : undefined,
      redis: typeof b.redis === "string" ? b.redis : undefined,
      status: typeof b.status === "string" ? b.status : undefined,
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshHealth();
    });
    const h = window.setInterval(() => void refreshHealth(), 60000);
    return () => clearInterval(h);
  }, [refreshHealth]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadIncidents();
      void refreshKpis();
      void loadZones();
    });
    const t = window.setInterval(() => void loadIncidents(), 30000);
    const k = window.setInterval(() => void refreshKpis(), 30000);
    const z = window.setInterval(() => void loadZones(), 60000);
    return () => {
      clearInterval(t);
      clearInterval(k);
      clearInterval(z);
    };
  }, [loadIncidents, refreshKpis, loadZones]);

  useEffect(() => {
    const s = getIncidentSocket();
    if (!s.connected) s.connect();

    /** @type {(p: Record<string, unknown>) => void} */
    const onNew = (p) => {
      const id = String(p.incidentId ?? "");
      if (!id) return;
      setRows((prev) => {
        if (prev.some((r) => String(r._id) === id)) return prev;
        const stub = {
          _id: id,
          status: typeof p.status === "string" ? p.status : "PENDING",
          source: p.source ?? "UNKNOWN",
          type: p.type ?? "UNKNOWN",
          signalId: "",
          phoneNumber: undefined,
          createdAt: typeof p.timestamp === "string" ? p.timestamp : new Date().toISOString(),
          updatedAt: typeof p.timestamp === "string" ? p.timestamp : new Date().toISOString(),
        };
        return /** @type {Incident[]} */ ([stub, ...prev]);
      });
      void refreshKpis();
    };

    /** @type {() => void} */
    const updateKpis = () => {
      void refreshKpis();
    };

    s.on("incident:new", onNew);
    s.on("incident:ves-complete", updateKpis);
    s.on("incident:status-changed", updateKpis);
    s.on("warden:kyc-complete", updateKpis);
    return () => {
      s.off("incident:new", onNew);
      s.off("incident:ves-complete", updateKpis);
      s.off("incident:status-changed", updateKpis);
      s.off("warden:kyc-complete", updateKpis);
    };
  }, [refreshKpis]);

  /** Re-merge polled rows with stubs: polling replaces ordering from server while keeping newest server truth */
  const mergedSorted = useMemo(() => sortIncidents(rows), [rows]);

  /** Incidents that have coordinates, merged with live overlay for tier/status */
  const mapIncidents = useMemo(
    () =>
      mergedSorted
        .filter((inc) => {
          const c = /** @type {{ lat?: number; lng?: number } | undefined} */ (inc.coordinates);
          return c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng));
        })
        .map((inc) => {
          const id = String(inc._id ?? "");
          const ov = overlays[id] ?? {};
          return {
            ...inc,
            vesTier: /** @type {{ tier?: string }} */ (ov.ves ?? {}).tier ?? inc.vesTier,
            vesScore: /** @type {{ score?: number }} */ (ov.ves ?? {}).score ?? inc.vesScore,
            status: ov.statusOverride ?? inc.status,
          };
        }),
    [mergedSorted, overlays],
  );

  const tiles = useMemo(
    () => [
      { title: "Active incidents", value: kpi.active, icon: Activity, hint: "WATCH+HIGH+CRITICAL" },
      { title: "Critical now", value: kpi.critical, icon: ShieldAlert, hint: "tier CRITICAL" },
      { title: "Dispatched today", value: kpi.dispatchedToday, icon: Cpu, hint: "UTC day" },
      { title: "Verified wardens", value: kpi.verifiedWardens, icon: UsersIcon, hint: "VERIFIED status" },
    ],
    [kpi],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Operations dashboard</h1>
          <p className="text-sm text-zinc-500">
            Live Nokia pipeline — WebSocket events update cards in real time.
          </p>
        </div>
      </header>

      {!health.ok ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden />
          <div>
            <div className="font-semibold">Infrastructure degraded</div>
            <p className="mt-1 text-red-100/80">
              Health check returned{" "}
              <code className="rounded bg-black/30 px-1 py-px font-mono text-xs">
                {String(health.status ?? "error")}
              </code>
              . mongo:{" "}
              <span className="font-mono text-xs">{String(health.mongo ?? "?")}</span>, redis:{" "}
              <span className="font-mono text-xs">{String(health.redis ?? "?")}</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <KpiTile key={t.title} {...t} />
        ))}
      </div>

      {/* Main panel: map + incident feed side-by-side */}
      <div className="grid gap-5 xl:grid-cols-[1fr,420px]">
        {/* Map */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Live zone map — Lagos
            </h2>
            <span className="text-[11px] text-zinc-600">
              {zones.length} zone{zones.length !== 1 ? "s" : ""} · {mapIncidents.length} pin{mapIncidents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-[440px] overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/[0.04]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-zinc-900 text-sm text-zinc-500">
                  Loading map…
                </div>
              }
            >
              <BiconMap
                zones={/** @type {import("../components/BiconMap.jsx").MapZone[]} */ (zones)}
                incidents={/** @type {import("../components/BiconMap.jsx").MapIncident[]} */ (mapIncidents)}
              />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
            {Object.entries({ CRITICAL: "#ef4444", HIGH: "#f97316", WATCH: "#22c55e", Dismissed: "#52525b" }).map(
              ([label, color]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    style={{ background: color }}
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white/30"
                  />
                  {label}
                </span>
              ),
            )}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-grn/60 bg-grn/20" />
              Zone boundary
            </span>
          </div>
        </div>

        {/* Incident feed */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-200">Incident feed</h2>
            <button
              type="button"
              className="text-xs font-medium text-grn hover:text-grn"
              onClick={() => {
                void loadIncidents();
                void refreshKpis();
              }}
            >
              Refresh
            </button>
          </div>
          {listErr ? (
            <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/30">
              {listErr}
            </div>
          ) : null}
          <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto pr-1">
            {mergedSorted.map((inc) => {
              const id = String(inc._id);
              const ov = overlays[id] ?? {};
              return (
                <IncidentFeedCard
                  key={id}
                  incident={inc}
                  overlay={/** @type {Record<string, unknown>} */ (ov)}
                  onDone={() => {
                    void loadIncidents();
                    void refreshKpis();
                  }}
                />
              );
            })}
            {!mergedSorted.length ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-zinc-500">
                No incidents yet — create a zone or run a simulation.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

/** @param {{ title: string; value: number | string; icon: typeof ShieldAlert; hint?: string }} props */
function KpiTile({ title, value, icon: Icon, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 ring-1 ring-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </div>
        <Icon className="h-4 w-4 text-grn/80" aria-hidden />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-white">{value}</div>
      {hint ? <div className="mt-2 text-[11px] text-zinc-600">{hint}</div> : null}
    </div>
  );
}

/** @param {Incident[]} nextRows @param {Incident[]} prevRows */
function mergeIncidentRows(nextRows, prevRows) {
  /** @type {Map<string, Incident>} */
  const merged = new Map();
  nextRows.forEach((row) => {
    merged.set(String(row._id ?? ""), row);
  });
  prevRows.forEach((row) => {
    const id = String(row._id ?? "");
    if (!id || merged.has(id) || !isTransientIncident(row)) return;
    merged.set(id, row);
  });
  return sortIncidents([...merged.values()]);
}

/** @param {Incident[]} items */
function sortIncidents(items) {
  return [...items].sort((a, b) => stampOf(b) - stampOf(a));
}

/** @param {Incident} item */
function stampOf(item) {
  const raw = typeof item.createdAt === "string" ? item.createdAt : "";
  const value = Date.parse(raw);
  return Number.isNaN(value) ? 0 : value;
}

/** @param {Incident} item */
function isTransientIncident(item) {
  const status = String(item.status ?? "");
  const signalId = String(item.signalId ?? "");
  return !signalId || status === "PENDING" || status === "SCORING";
}
