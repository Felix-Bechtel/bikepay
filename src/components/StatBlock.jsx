// Big stat with a label + trailing unit. Used on the dashboard hero & wallet.
export function StatBlock({ label, value, unit, big = false, tone }) {
  const valStyle = {
    fontSize: big ? "3rem" : "1.4rem",
    fontWeight: 800,
    letterSpacing: "-.02em",
    color: tone === "primary" ? "var(--primary)" : "var(--text)",
    textShadow: tone === "primary" ? "0 0 20px rgba(87,241,219,.4)" : "none",
  };
  return (
    <div>
      <div
        style={{
          fontSize: ".7rem",
          letterSpacing: ".08em",
          fontWeight: 700,
          textTransform: "uppercase",
          color: "var(--dim)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: ".4rem" }}>
        <span style={valStyle}>{value}</span>
        {unit && <span style={{ color: "var(--dim)", fontSize: ".95rem" }}>{unit}</span>}
      </div>
    </div>
  );
}
