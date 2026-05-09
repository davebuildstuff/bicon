/** Backend origin — no trailing slash */
export function getOrigin() {
  const v = import.meta.env?.VITE_API_ORIGIN;
  if (typeof v === "string" && v.trim()) return v.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.port === "5173") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
}

export function apiRoot() {
  return `${getOrigin()}/api`;
}
