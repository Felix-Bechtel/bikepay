import { fmtKm, isoShort } from "../lib/format.js";

export function RideRow({ session }) {
  const dur = session.end_ts - session.start_ts;
  return (
    <div
      className="glass-card"
      style={{
        padding: "1rem",
        borderRadius: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>{fmtKm(session.km)} km</div>
        <div style={{ color: "var(--dim)", fontSize: ".8rem" }}>
          {isoShort(session.start_ts)} · {Math.round(dur / 60000)} min
        </div>
      </div>
      <span style={{ color: "var(--primary)", fontSize: ".75rem" }}>
        {session.source}
      </span>
    </div>
  );
}
