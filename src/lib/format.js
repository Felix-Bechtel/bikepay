// Pure formatting helpers. No DOM, no React.

export const fmtCad = (n) => "$" + (Number(n) || 0).toFixed(2);
export const fmtKm = (n) => (Number(n) || 0).toFixed(2);

export function isoShort(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDuration(ms) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
