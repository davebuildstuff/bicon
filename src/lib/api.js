import { apiRoot, getOrigin } from "./config.js";

/** @typedef {{ status?: string; statusCode?: number; data?: unknown; message?: string; errors?: unknown[] }} Envelope */

let jwt = "";

/** Memory-only JWT (spec: no localStorage) */
export function setAuthToken(token) {
  jwt = token || "";
}

export function getAuthToken() {
  return jwt;
}

let onUnauthorized = () => {};

export function setOnUnauthorized(cb) {
  onUnauthorized = typeof cb === "function" ? cb : () => {};
}

export class ApiError extends Error {
  /** @param {string} message @param {number} [status] @param {unknown} [extras] */
  constructor(message, status, extras) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.extras = extras;
  }
}

/** @returns {unknown}Envelope `body` */
async function readBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok && res.status === 204) return undefined;
  if (res.status === 204) return undefined;
  if (!ct.includes("application/json")) {
    const text = await res.text();
    return text ? { message: text } : {};
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** @param {Envelope} body */
function errFromEnvelope(body, status) {
  const msg =
    (body && typeof body.message === "string" && body.message) ||
    `Request failed (${status})`;
  return new ApiError(msg, status, body.errors);
}

/**
 * JSON API under /api — standard envelope unless noted.
 * @template T
 * @param {string} path `/incidents`, `/zones`, etc.
 * @param {RequestInit & { skipAuth?: boolean }} [opts]
 * @returns {Promise<T>}
 */
export async function api(path, opts = {}) {
  const { skipAuth, headers: h, ...init } = opts;
  /** @type {Record<string,string>} */
  const headers = { ...(h ? Object.fromEntries(new Headers(h).entries()) : {}) };
  if (init.body && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth && jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch(`${apiRoot()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });
  const body = /** @type {Envelope} */ (await readBody(res));

  if (res.status === 401 && !skipAuth) {
    jwt = "";
    onUnauthorized();
  }

  if (res.status === 429) {
    throw new ApiError("Too many requests, please wait", 429);
  }

  const envStatus = body && body.status === "error";
  if (!res.ok || envStatus) {
    if (body && body.status === "error") throw errFromEnvelope(body, res.status);
    throw errFromEnvelope(
      { message: (body && body.message) || `HTTP ${res.status}` },
      res.status,
    );
  }

  const data =
    body && Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
  return /** @type {T} */ (data);
}

/** @template T */
export async function fetchHealth() {
  try {
    const res = await fetch(`${getOrigin()}/health`);
    const body = await readBody(res);
    const ok = res.ok && body && typeof body === "object" && body.status === "ok";
    return { ok, res, body };
  } catch (error) {
    return {
      ok: false,
      res: null,
      body: {
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
      },
    };
  }
}

/**
 * Simulate returns raw JSON, no envelope.
 * @param {string} scenario
 * @param {{ version?: string }} [bodyOpt]
 */
export async function simulate(scenario, bodyOpt) {
  /** @type {Record<string, string>} */
  const headers = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (bodyOpt && Object.keys(bodyOpt).length) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${apiRoot()}/simulate/${encodeURIComponent(scenario)}`, {
    method: "POST",
    headers,
    body:
      bodyOpt && Object.keys(bodyOpt).length ? JSON.stringify(bodyOpt) : undefined,
  });
  const raw = /** @type {Record<string, unknown>} */ await readBody(res);
  if (res.status === 401) {
    jwt = "";
    onUnauthorized();
  }
  if (res.status === 429) {
    throw new ApiError("Too many requests, please wait", 429);
  }
  if (res.status === 400 || !res.ok) {
    const msg =
      (raw && typeof raw.message === "string" && raw.message) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, raw.errors);
  }
  return raw;
}

/** DELETE /api/zones/:id → 204 */
export async function apiDeleteZones(id) {
  const res = await fetch(`${apiRoot()}/zones/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.status === 401) {
    jwt = "";
    onUnauthorized();
  }
  if (res.status === 429) throw new ApiError("Too many requests, please wait", 429);
  if (res.status === 404) throw new ApiError("Not found", 404);
  if (res.status === 204) return;
  const body = await readBody(res);
  if (!res.ok) {
    throw errFromEnvelope(
      typeof body === "object" ? body : { message: `HTTP ${res.status}` },
      res.status,
    );
  }
}
