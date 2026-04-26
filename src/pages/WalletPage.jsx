import { useStore } from "../state/store.js";
import { GlassCard } from "../components/GlassCard.jsx";
import { WithdrawalRow } from "../components/WithdrawalRow.jsx";

export function WalletPage() {
  const withdrawals = useStore((s) => s.data.withdrawals) || [];
  return (
    <div className="app-shell stack">
      <GlassCard>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Transactions</h1>
        <div className="muted" style={{ fontSize: ".85rem", marginTop: ".25rem" }}>
          Newest first. Tap a row for details.
        </div>
      </GlassCard>

      <div className="stack">
        {withdrawals.length === 0 && (
          <GlassCard>
            <div className="muted">No withdrawals yet.</div>
          </GlassCard>
        )}
        {withdrawals.map((w) => (
          <WithdrawalRow key={w.id} withdrawal={w} />
        ))}
      </div>
    </div>
  );
}
