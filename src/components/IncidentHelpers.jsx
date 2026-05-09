/**
 * Merge REST incident row with realtime overlay keys for display.
 * @param {Record<string, unknown>|null|undefined} inc
 * @param {Record<string, unknown>|null|undefined} overlay
 */
export function displayIncident(inc, overlay) {
  const row = inc && typeof inc === "object" ? inc : {};
  const ov = overlay && typeof overlay === "object" ? overlay : {};

  const status =
    typeof ov.statusOverride === "string" && ov.statusOverride
      ? ov.statusOverride
      : String(row.status ?? "");

  let vesScore;
  if (ov.ves && typeof ov.ves === "object" && "score" in ov.ves) {
    vesScore = Number(/** @type {{ score: number }} */ (ov.ves).score);
  } else if (typeof row.vesScore === "number") {
    vesScore = row.vesScore;
  }

  let vesTier;
  if (ov.ves && typeof ov.ves === "object" && "tier" in ov.ves) {
    vesTier = String(/** @type {{ tier: string }} */ (ov.ves).tier);
  } else if (typeof row.vesTier === "string") {
    vesTier = row.vesTier;
  }

  let triage =
    ov.triage && typeof ov.triage === "object" && "triage" in ov.triage
      ? /** @type {{ triage: unknown }} */ (ov.triage).triage
      : row.triage;

  let summary = "";
  if (triage && typeof triage === "object" && "summary" in triage) {
    const s = /** @type {{ summary?: string }} */ (triage).summary;
    summary = typeof s === "string" ? s : "";
  }

  return { status, vesScore, vesTier, summary, raw: row, overlay: ov };
}
