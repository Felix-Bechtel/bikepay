// Tiny CSV → ImportInput[] parser. Header: start_ts,end_ts,km[,external_id].
// Timestamps may be ms-epoch ints or anything Date.parse accepts.
export function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((s) => s.trim());
  const idx = (n) => header.indexOf(n);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < 3) continue;
    const start = toMs(parts[idx("start_ts")]);
    const end = toMs(parts[idx("end_ts")]);
    const km = parseFloat(parts[idx("km")]);
    const ext = idx("external_id") >= 0 ? parts[idx("external_id")] : null;
    if (!isFinite(start) || !isFinite(end) || !isFinite(km)) continue;
    out.push({
      source: "csv",
      external_id: ext || null,
      start_ts: start,
      end_ts: end,
      km,
    });
  }
  return out;
}

function toMs(v) {
  if (!v) return NaN;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return Date.parse(v);
}
