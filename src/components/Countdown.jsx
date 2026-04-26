import { useEffect, useState } from "react";
import { fmtDuration } from "../lib/format.js";

// Live countdown — re-renders every second until expiry.
export function Countdown({ expiresTs }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = expiresTs - Date.now();
  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        color: "var(--warn)",
      }}
    >
      {fmtDuration(ms)}
    </span>
  );
}
