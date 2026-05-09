import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { ApiError, api, apiDeleteZones } from "../lib/api.js";
import { getIncidentSocket } from "../lib/socket.js";

const BiconMap = lazy(() => import("../components/BiconMap.jsx"));

/** @typedef {Record<string, unknown>} Zone */

export default function ZonesPage() {
  /** @type {[Zone[], React.Dispatch<React.SetStateAction<Zone[]>>]} */
  const [zones, setZones] = useState(/** @type {Zone[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [busyRow, setBusyRow] = useState("");
  const [editing, setEditing] = useState({ id: "", name: "" });

  const [draft, setDraft] = useState({
    name: "Ikeja Lagos",
    lat: "6.601338",
    lng: "3.351485",
    radius: "2000",
  });

  /** @type {[[number,number]|null, React.Dispatch<React.SetStateAction<[number,number]|null>>]} */
  const [clickedPin, setClickedPin] = useState(/** @type {[number,number]|null} */ (null));

  /** @param {number} lat @param {number} lng */
  function handleMapClick(lat, lng) {
    setDraft((d) => ({ ...d, lat: String(lat), lng: String(lng) }));
    setClickedPin([lat, lng]);
  }

  const load = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);
      const data = await api(`/zones`);
      const list = Array.isArray(data) ? /** @type {Zone[]} */ (data) : [];
      setZones(list);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const s = getIncidentSocket();
    if (!s.connected) s.connect();

    /** @type {(p: Record<string, unknown>) => void} */
    const onZu = (p) => {
      const zoneId = String(p.zoneId ?? "");
      if (!zoneId) return;
      setZones((prev) =>
        prev.map((z) =>
          String(z._id ?? "") !== zoneId
            ? z
            : {
                ...z,
                active: typeof p.active === "boolean" ? p.active : z.active,
                name: typeof p.name === "string" ? p.name : z.name,
              },
        ),
      );
    };

    s.on("zone:updated", onZu);
    return () => void s.off("zone:updated", onZu);
  }, []);

  async function createZone(e) {
    e.preventDefault();
    setFormErr("");
    const name = draft.name.trim();
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    const radius = Number(draft.radius);
    if (!name || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
      setFormErr("Valid name plus numeric lat/lng/radius required");
      return;
    }
    if (radius < 100) {
      setFormErr("Radius must be at least 100 metres");
      return;
    }
    try {
      await api("/zones", {
        method: "POST",
        body: JSON.stringify({
          name,
          lat,
          lng,
          radius,
        }),
      });
      await load();
      setDraft((d) => ({ ...d, name: `${name}` }));
    } catch (ze) {
      setFormErr(ze instanceof ApiError ? ze.message : "Create failed");
    }
  }

  async function toggleActive(z) {
    const id = String(z._id ?? "");
    if (!id) return;
    const activeNow = z.active !== false;
    const nextActive = !activeNow;
    try {
      setBusyRow(id);
      await api(`/zones/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      await load();
    } catch (pe) {
      setErr(pe instanceof ApiError ? pe.message : "Update failed");
    } finally {
      setBusyRow("");
    }
  }

  async function saveZoneName(id) {
    const name = editing.name.trim();
    if (!id) return;
    if (!name) {
      setErr("Zone name is required");
      return;
    }
    try {
      setBusyRow(id);
      setErr("");
      await api(`/zones/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setEditing({ id: "", name: "" });
      await load();
    } catch (pe) {
      setErr(pe instanceof ApiError ? pe.message : "Rename failed");
    } finally {
      setBusyRow("");
    }
  }

  async function removeZone(id) {
    if (!window.confirm("Cancel Nokia subscription and delete this zone permanently?")) return;
    try {
      setBusyRow(id);
      await apiDeleteZones(id);
      await load();
    } catch (de) {
      setErr(de instanceof ApiError ? de.message : "Delete failed");
    } finally {
      setBusyRow("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Geofence zones</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Flat <code className="text-xs text-emerald-300">lat</code>/<code className="text-xs text-emerald-300">
            lng
          </code>{" "}
          payload per backend contract. Creating a zone spawns Nokia subscriptions instantly.
        </p>
      </header>

      {err ? (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-100 ring-1 ring-red-500/30">
          {err}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
        <form
          className="h-max space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5"
          onSubmit={createZone}
        >
          <h2 className="text-lg font-semibold text-zinc-200">Register zone</h2>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Lat
              <input
                value={draft.lat}
                onChange={(e) => setDraft((d) => ({ ...d, lat: e.target.value }))}
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Lng
              <input
                value={draft.lng}
                onChange={(e) => setDraft((d) => ({ ...d, lng: e.target.value }))}
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Radius (m, min 100)
            <input
              value={draft.radius}
              onChange={(e) => setDraft((d) => ({ ...d, radius: e.target.value }))}
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          {formErr ? (
            <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-50 ring-1 ring-amber-500/30">
              {formErr}
            </div>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
          >
            Create zone
          </button>
        </form>

        <div className="space-y-4">
          {/* Interactive map */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Zone map — click to set coordinates
              </h2>
              {clickedPin ? (
                <span className="font-mono text-[11px] text-emerald-300">
                  {clickedPin[0].toFixed(5)}, {clickedPin[1].toFixed(5)}
                </span>
              ) : null}
            </div>
            <div className="h-[280px] overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/[0.04]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center bg-zinc-900 text-sm text-zinc-500">
                    Loading map…
                  </div>
                }
              >
                <BiconMap
                  zones={/** @type {import("../components/BiconMap.jsx").MapZone[]} */ (zones)}
                  onMapClick={handleMapClick}
                  clickedPin={clickedPin}
                />
              </Suspense>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Click anywhere on the map to auto-fill lat/lng in the form.
            </p>
          </div>

          <h2 className="text-lg font-semibold text-zinc-200">Active subscriptions</h2>
          {loading ? <div className="text-sm text-zinc-500">Loading zones…</div> : null}
          <div className="grid gap-3">
            {!loading && zones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
                No zones configured yet.
              </div>
            ) : null}
            {zones.map((z) => (
              <div
                key={String(z._id)}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="min-w-0">
                  {editing.id === String(z._id) ? (
                    <div className="flex max-w-sm items-center gap-2">
                      <input
                        value={editing.name}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        disabled={busyRow === String(z._id)}
                        onClick={() => void saveZoneName(String(z._id))}
                        className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={busyRow === String(z._id)}
                        onClick={() => setEditing({ id: "", name: "" })}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-white">{String(z.name)}</div>
                  )}
                  <div className="mt-1 font-mono text-[11px] text-zinc-500">{String(z._id)}</div>
                  <div className="mt-2 grid gap-1 text-xs text-zinc-400 md:grid-cols-2 md:gap-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Center
                      </span>
                      <div className="font-mono text-xs text-emerald-200">
                        {String(z.lat)}, {String(z.lng)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Radius
                      </span>
                      <div className="font-mono text-xs text-zinc-200">{String(z.radius)} m</div>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Nokia subscriptionId
                      </span>
                      <div className="break-all font-mono text-[11px] text-zinc-300">
                        {z.subscriptionId ? String(z.subscriptionId) : <span className="text-zinc-600">pending</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                      z.active === false
                        ? "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30"
                        : "bg-emerald-500/10 text-emerald-200 ring-emerald-400/35"
                    }`}
                  >
                    {z.active === false ? "Inactive" : "Active"}
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={busyRow === String(z._id)}
                      onClick={() =>
                        setEditing({
                          id: String(z._id),
                          name: String(z.name ?? ""),
                        })
                      }
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
                    >
                      Edit name
                    </button>
                    <button
                      type="button"
                      disabled={busyRow === String(z._id)}
                      onClick={() => void toggleActive(z)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-40"
                    >
                      Toggle active
                    </button>
                    <button
                      type="button"
                      disabled={busyRow === String(z._id)}
                      onClick={() => void removeZone(String(z._id))}
                      className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
