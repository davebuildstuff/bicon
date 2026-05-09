/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  api,
  setAuthToken as setApiJwt,
  setOnUnauthorized as setGlobal401,
} from "../lib/api.js";
import { disconnectIncidentSocket } from "../lib/socket.js";

const TOKEN_KEY = "bicon_jwt";
const DEMO_SECRET = "Y2lyY3VzcnVzaGJ1ZmZhbA==";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, _setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Restore token from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) ?? "";
    if (stored) {
      setApiJwt(stored);
      return;
    }
    // No stored token — auto-login silently so no one ever sees a login screen
    api("/auth/token", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ adminSecret: DEMO_SECRET }),
    })
      .then((data) => {
        const access =
          data && typeof data === "object" && "access_token" in data
            ? data.access_token
            : "";
        if (access) {
          setApiJwt(access);
          _setToken(access);
          localStorage.setItem(TOKEN_KEY, access);
        }
      })
      .catch(() => {
        // Backend unreachable — user stays on landing page, dashboard will redirect to /login
      });
  }, []);

  const logout = useCallback(() => {
    disconnectIncidentSocket();
    setApiJwt("");
    _setToken("");
    localStorage.removeItem(TOKEN_KEY);
    navigate("/", { replace: true });
  }, [navigate]);

  const unauthorized = useCallback(() => {
    disconnectIncidentSocket();
    setApiJwt("");
    _setToken("");
    localStorage.removeItem(TOKEN_KEY);
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setGlobal401(unauthorized);
  }, [unauthorized]);

  const login = useCallback(async (adminSecret) => {
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/token", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ adminSecret }),
      });
      const access =
        data && typeof data === "object" && "access_token" in data
          ? /** @type {{ access_token:string }} */ (data).access_token
          : "";
      if (!access) throw new ApiError("No access_token in response", 400);
      setApiJwt(access);
      _setToken(access);
      localStorage.setItem(TOKEN_KEY, access);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Login failed";
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      token,
      busy,
      error,
      login,
      logout,
      setError,
    }),
    [token, busy, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth requires AuthProvider");
  return v;
}
