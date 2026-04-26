import { useStore } from "../state/store.js";
import { GlassCard } from "../components/GlassCard.jsx";
import { RideRow } from "../components/RideRow.jsx";

export function RidesPage() {
  const sessions = useStore((s) => s.data.sessions);
  const sorted = [...(sessions || [])].sort((a, b) => b.start_ts - a.start_ts);
  return (
    <div className="app-shell stack">
      <GlassCard>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Ride history</h1>
        <div className="muted" style={{ fontSize: ".85rem", marginTop: ".25rem" }}>
          All rides — XOSS / BLE / CSV / manual. Add rides in Settings.
        </div>
      </GlassCard>

      <div className="stack">
        {sorted.length === 0 && (
          <GlassCard>
            <div className="muted">No rides yet. Add one in Settings.</div>
          </GlassCard>
        )}
        {sorted.map((s) => (
          <RideRow key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
