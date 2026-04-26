import { useState } from "react";
import { useStore } from "../state/store.js";
import { GlassCard } from "../components/GlassCard.jsx";
import { StatBlock } from "../components/StatBlock.jsx";
import { Modal } from "../components/Modal.jsx";
import { WithdrawalRow } from "../components/WithdrawalRow.jsx";
import { InstallCard } from "../components/InstallCard.jsx";
import { computeBalance, shouldHideWallet } from "../lib/compute.js";
import { fmtCad, fmtKm } from "../lib/format.js";
import { startWithdrawal } from "../state/actions.js";
import { CAD_PER_KM } from "../constants.js";
import { formatPhone } from "../lib/auth-local.js";

const MILESTONE_KM = 1500;

export function DashboardPage() {
  const { data, walletResetOverride, account } = useStore((s) => ({
    data: s.data,
    walletResetOverride: s.walletResetOverride,
    account: s.currentAccount,
  }));
  const t = computeBalance(data);
  const hideWallet = shouldHideWallet({
    withdrawals: data.withdrawals,
    walletResetOverride,
  });
  const pending = (data.withdrawals || []).filter((w) => w.status === "pending");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="app-shell stack">
      <InstallCard compact />
      <GlassCard>
        <Label>Total distance ridden</Label>
        <StatBlock value={t.total_km.toLocaleString()} unit="km" big tone="primary" label="" />
        <ProgressBar pct={Math.min(100, (t.total_km / MILESTONE_KM) * 100)} />
        <div className="muted" style={{ fontSize: ".8rem", marginTop: ".5rem" }}>
          Next milestone: {MILESTONE_KM} km
        </div>
      </GlassCard>

      {!hideWallet && (
        <GlassCard>
          <Label>Wallet balance</Label>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: 4 }}>
            {fmtCad(t.cad_balance)}
          </div>
          <div className="row" style={{ marginTop: ".9rem", gap: ".7rem" }}>
            <MiniStat label="Unwithdrawn" value={fmtKm(t.unwithdrawn_km)} unit="km" />
            <MiniStat label="Rate" value={`$${CAD_PER_KM.toFixed(2)}`} unit="/ km" />
          </div>
          <button
            className="btn"
            style={{ marginTop: "1rem" }}
            disabled={t.unwithdrawn_km <= 0}
            onClick={() => setConfirmOpen(true)}
          >
            Withdraw {fmtCad(t.cad_balance)}
          </button>
          <div className="muted" style={{ fontSize: ".75rem", marginTop: ".4rem" }}>
            SMS sent to {formatPhone(account.payoutPhone)}
          </div>
        </GlassCard>
      )}

      {pending.length > 0 && (
        <GlassCard>
          <Label>Pending</Label>
          <div className="stack" style={{ marginTop: ".5rem" }}>
            {pending.map((w) => (
              <WithdrawalRow key={w.id} withdrawal={w} />
            ))}
          </div>
        </GlassCard>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h2 style={{ marginTop: 0 }}>Confirm withdrawal</h2>
        <div className="glass-card" style={{ padding: "1rem", borderRadius: 18, marginBottom: "1rem" }}>
          <Label>Withdrawal amount</Label>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)" }}>
            {fmtCad(t.cad_balance)}
          </div>
          <div className="muted" style={{ fontSize: ".85rem", marginTop: 2 }}>
            {fmtKm(t.unwithdrawn_km)} km total
          </div>
        </div>
        <p className="muted" style={{ fontSize: ".8rem" }}>
          An SMS will open in your messaging app, addressed to{" "}
          <strong style={{ color: "var(--text)" }}>{formatPhone(account.payoutPhone)}</strong>.
          The recipient must reply <code>$</code> within 24 hours to confirm.
        </p>
        <div className="row" style={{ gap: ".7rem", marginTop: ".7rem" }}>
          <button className="btn secondary grow" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
          <button
            className="btn grow"
            onClick={() => {
              setConfirmOpen(false);
              startWithdrawal();
            }}
          >
            Open SMS
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: ".7rem",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: "var(--dim)",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function MiniStat({ label, value, unit }) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--surface-low)",
        borderRadius: 16,
        padding: ".7rem",
        border: "1px solid rgba(255,255,255,.05)",
      }}
    >
      <div
        style={{
          fontSize: ".62rem",
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        {label}
      </div>
      <div>
        <span style={{ fontSize: "1rem", fontWeight: 700 }}>{value}</span>
        <span className="muted" style={{ fontSize: ".75rem" }}> {unit}</span>
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        height: 8,
        width: "100%",
        background: "var(--surface-high)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--primary)",
          boxShadow: "0 0 10px rgba(87,241,219,.6)",
          transition: "width 1s ease",
        }}
      />
    </div>
  );
}
