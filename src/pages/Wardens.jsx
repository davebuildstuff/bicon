import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../lib/api.js";
import { getIncidentSocket } from "../lib/socket.js";

/** @typedef {Record<string, unknown>} Warden */

function assertPaged(data) {
  if (data && typeof data === "object" && Array.isArray(/** @type {{ data?: unknown }} */ (data).data)) {
    return /** @type {{ data: Warden[]; pagination: { total: number; totalPages: number; page: number; limit: number } }} */ (
      data
    );
  }
  return { data: [], pagination: { total: 0, totalPages: 1, page: 1, limit: 20 } };
}

export default function WardensPage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(/** @type {Warden[]} */ ([]));
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [draft, setDraft] = useState({
    name: "Chidi Okeke",
    phoneNumber: "+99999991001",
    zoneId: "",
    idDocument: "66666666q",
  });

  const load = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);
      const raw = await api(`/wardens?page=${page}&limit=20`);
      const { data, pagination: p } = assertPaged(raw);
      setRows(data);
      setPagination((prev) => ({
        ...prev,
        total: p.total,
        totalPages: p.totalPages,
        page: p.page,
        limit: p.limit,
      }));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load wardens");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const s = getIncidentSocket();
    if (!s.connected) s.connect();

    /** @type {(p: Record<string, unknown>) => void} */
    const onKyc = (p) => {
      const id = String(p.wardenId ?? "");
      const status = String(p.status ?? "");
      setRows((prev) =>
        prev.map((w) =>
          String(w._id) === id
            ? {
                ...w,
                status,
                kycMatchScore:
                  typeof p.kycMatchScore === "number" ? p.kycMatchScore : w.kycMatchScore,
              }
            : w,
        ),
      );
      if (status === "VERIFIED") {
        setToast("Warden verified via Nokia KYC");
      } else if (status === "REJECTED") {
        setToast("Warden KYC failed");
      }
      window.setTimeout(() => setToast(""), 6000);
    };

    s.on("warden:kyc-complete", onKyc);
    return () => void s.off("warden:kyc-complete", onKyc);
  }, []);

  async function register(e) {
    e.preventDefault();
    setErr("");
    const body = {
      name: draft.name.trim(),
      phoneNumber: draft.phoneNumber.trim(),
      idDocument: draft.idDocument.trim() || undefined,
      zoneId: draft.zoneId.trim() || undefined,
    };
    if (body.name.length < 2) {
      setErr("Name must be at least 2 characters");
      return;
    }
    const e164 = /^\+[1-9]\d{6,14}$/;
    if (!e164.test(body.phoneNumber)) {
      setErr("Phone must be E.164 (+countrycode…)");
      return;
    }
    if (body.zoneId && !/^[a-f\d]{24}$/i.test(body.zoneId)) {
      setErr("Zone ID must be a valid Mongo ObjectId");
      return;
    }
    try {
      await api("/wardens", { method: "POST", body: JSON.stringify(body) });
      await load();
    } catch (re) {
      setErr(re instanceof ApiError ? re.message : "Registration failed");
    }
  }

  async function deactivate(id) {
    if (!window.confirm("Deactivate this warden?")) return;
    try {
      await api(`/wardens/${encodeURIComponent(id)}/deactivate`, { method: "PATCH" });
      await load();
    } catch (de) {
      setErr(de instanceof ApiError ? de.message : "Deactivate failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Field wardens</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Registration immediately returns <code className="text-xs text-emerald-300">PENDING</code>. Nokia KYC
          completes in a few seconds and fires <code className="text-xs text-emerald-300">warden:kyc-complete</code>.
        </p>
      </header>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
          {toast}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-100 ring-1 ring-red-500/30">
          {err}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
        <form
          className="h-max space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5"
          onSubmit={register}
        >
          <h2 className="text-lg font-semibold text-zinc-200">Register warden</h2>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Name (min 2 chars)
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Phone (E.164)
            <input
              value={draft.phoneNumber}
              onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Zone Mongo ID (optional)
            <input
              value={draft.zoneId}
              onChange={(e) => setDraft((d) => ({ ...d, zoneId: e.target.value }))}
              placeholder="6627..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            ID document sandbox hint optional
            <input
              value={draft.idDocument}
              onChange={(e) => setDraft((d) => ({ ...d, idDocument: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              placeholder='Use "66666666q" in Nokia sandbox for VERIFIED'
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
          >
            Submit registration
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-200">Directory</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <button
                type="button"
                disabled={loading || pagination.page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
                className="rounded-md border border-white/10 px-3 py-1 font-semibold text-zinc-200 disabled:opacity-30"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums">
                {pagination.page} / {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() => setPage((x) => x + 1)}
                className="rounded-md border border-white/10 px-3 py-1 font-semibold text-zinc-200 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? <div className="text-sm text-zinc-500">Fetching wardens…</div> : null}

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full table-fixed text-left text-xs text-zinc-300">
              <thead className="bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((w) => (
                  <tr key={String(w._id)} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-3 align-top">{String(w.name)}</td>
                    <td className="px-3 py-3 align-top font-mono text-emerald-200">
                      {String(w.phoneNumber)}
                    </td>
                    <td className="px-3 py-3 align-top">{String(w.status)}</td>
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold hover:bg-white/5"
                        onClick={() => void deactivate(String(w._id))}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-zinc-600">
                      No wardens onboarded yet — register someone on stage left.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
