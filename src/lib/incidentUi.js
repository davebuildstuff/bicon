/** @param {string} status */
export function canDispatch(status) {
  return status === "WATCH" || status === "HIGH" || status === "CRITICAL";
}

/** @param {string} status */
export function canDismiss(status) {
  return (
    status === "PENDING" ||
    status === "SCORING" ||
    status === "WATCH" ||
    status === "HIGH" ||
    status === "CRITICAL"
  );
}

/** @param {string} status */
export function canResolve(status) {
  return status === "DISPATCHED";
}

/** @param {string} tier */
export function tierTone(tier) {
  switch (tier) {
    case "CRITICAL":
      return {
        fg: "text-red-300",
        bg: "bg-red-500/15",
        border: "border-red-500/50",
        bar: "bg-red-500",
      };
    case "HIGH":
      return {
        fg: "text-orange-300",
        bg: "bg-orange-500/15",
        border: "border-orange-500/50",
        bar: "bg-orange-500",
      };
    case "WATCH":
      return {
        fg: "text-amber-200",
        bg: "bg-amber-500/15",
        border: "border-amber-500/50",
        bar: "bg-amber-500",
      };
    case "DISMISSED":
    default:
      return {
        fg: "text-zinc-400",
        bg: "bg-zinc-500/15",
        border: "border-zinc-500/40",
        bar: "bg-zinc-500",
      };
  }
}
