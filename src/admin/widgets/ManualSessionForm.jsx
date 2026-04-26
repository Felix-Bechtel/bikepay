import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.jsx";
import { addManualSession, toast } from "../../state/actions.js";

// Owner-only: add a single ride session by hand.
export function ManualSessionForm() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [km, setKm] = useState("");

  function submit() {
    const startTs = parseTs(start);
    const endTs = parseTs(end);
    const kmNum = parseFloat(km);
    if (!isFinite(startTs) || !isFinite(endTs) || endTs < startTs || kmNum <= 0) {
      return toast("Bad input", "bad");
    }
    addManualSession({ start_ts: startTs, end_ts: endTs, km: kmNum });
    setStart(""); setEnd(""); setKm("");
  }

  return (
    <GlassCard>
      <h2 style={{ margin: 0, fontSize: "1rem" }}>Add ride manually</h2>
      <label>Start (ISO or ms)</label>
      <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2026-04-26T18:00" />
      <label>End (ISO or ms)</label>
      <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="2026-04-26T18:35" />
      <label>km</label>
      <input value={km} onChange={(e) => setKm(e.target.value)} type="number" inputMode="decimal" step="0.01" placeholder="12.4" />
      <div style={{ height: ".5rem" }} />
      <button className="btn small" onClick={submit}>Add</button>
    </GlassCard>
  );
}

function parseTs(v) {
  if (!v) return NaN;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return Date.parse(v);
}
