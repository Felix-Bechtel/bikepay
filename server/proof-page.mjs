// Renders a static proof page from a withdrawal + its sessions. No DB access
// here — caller passes in the rows.
export function renderProofPage(w, sessions) {
  const fmt = (ms) =>
    new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const rows =
    sessions
      .map(
        (s) =>
          `<tr><td>${esc(s.id.slice(0, 8))}</td><td>${fmt(s.start_ts)}</td><td>${fmt(
            s.end_ts
          )}</td><td>${s.km.toFixed(2)} km</td><td>${esc(s.source)}</td></tr>`
      )
      .join("") ||
    `<tr><td colspan="5" class="muted">No sessions linked.</td></tr>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>BikePay proof ${esc(w.id.slice(0, 8))}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light dark}
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.5;background:#0b1326;color:#dae2fd}
  h1,h2{margin:0 0 .5rem 0}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.9rem}
  th,td{padding:.5rem;border-bottom:1px solid #2d3449;text-align:left}
  .muted{color:#94a3b8}
  .pill{display:inline-block;padding:.15rem .6rem;border-radius:999px;font-size:.8rem}
  .pending{background:#3a2d09;color:#ffb020}
  .confirmed{background:#0d2c1c;color:#22c55e}
  .expired{background:#1f2937;color:#9ca3af}
  .failed{background:#3a0d0d;color:#ef4444}
  code{background:#171f33;padding:.05rem .35rem;border-radius:6px}
</style></head><body>
<h1>BikePay — Withdrawal Proof</h1>
<p class="muted">Withdrawal id: <code>${esc(w.id)}</code></p>
<p>Status: <span class="pill ${esc(w.status)}">${esc(w.status)}</span></p>
<p><strong>${w.km.toFixed(2)} km</strong> → <strong>$${w.cad.toFixed(2)} CAD</strong></p>
<p class="muted">Created ${fmt(w.created_ts)} · Expires ${fmt(w.expires_ts)}${
    w.confirmed_ts ? ` · Confirmed ${fmt(w.confirmed_ts)}` : ""
  }</p>
<h2>Sessions used</h2>
<table>
  <thead><tr><th>id</th><th>start</th><th>end</th><th>km</th><th>source</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="muted" style="margin-top:2rem">This page is public but the URL is unguessable. Treat the link as the proof.</p>
</body></html>`;
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
