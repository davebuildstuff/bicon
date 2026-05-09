import { useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { ApiError } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { token, login, busy, error, setError } = useAuth();
  const [secret, setSecret] = useState("Y2lyY3VzcnVzaGJ1ZmZhbA==");

  if (token) return <Navigate to="/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    try {
      await login(secret.trim());
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Something went wrong");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-xl backdrop-blur">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-emerald-500/15 p-4 text-emerald-400 ring-1 ring-emerald-500/30">
            <KeyRound className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dispatcher sign-in</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Demo credentials are pre-filled. Click the button to access the dashboard.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-xs font-medium text-zinc-400">
            Admin secret
            <textarea
              value={secret}
              onChange={(e) => {
                setError("");
                setSecret(e.target.value);
              }}
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-3 font-mono text-sm text-emerald-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="paste base64 or raw secret from team"
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          {error ? (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy || secret.trim().length === 0}
            className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Access Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
