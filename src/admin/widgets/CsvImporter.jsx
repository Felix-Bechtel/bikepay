import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.jsx";
import { importCsv } from "../../state/actions.js";

// Owner-only: paste a CSV of XOSS exports / BLE bridge dumps.
export function CsvImporter() {
  const [csv, setCsv] = useState("");
  return (
    <GlassCard>
      <h2 style={{ margin: 0, fontSize: "1rem" }}>CSV import</h2>
      <div className="muted" style={{ fontSize: ".8rem", marginTop: ".25rem" }}>
        Header: <code>start_ts,end_ts,km[,external_id]</code>
      </div>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="start_ts,end_ts,km,external_id&#10;2026-04-26T18:00:00,2026-04-26T18:35:00,12.4,xoss-abc"
      />
      <div style={{ height: ".5rem" }} />
      <button
        className="btn small secondary"
        onClick={() => { if (csv.trim()) { importCsv(csv); setCsv(""); } }}
      >
        Import
      </button>
    </GlassCard>
  );
}
