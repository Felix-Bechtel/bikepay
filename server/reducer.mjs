/**
 * Pure-ish withdrawal reducer.
 *
 * The lifecycle (create / confirm / expire) is centralized here so both HTTP
 * routes and tests share the same code path. Side-effects (DB writes, SSE
 * broadcasts) are isolated behind small persistence + websocket calls.
 */
import { randomUUID } from "node:crypto";
import { config } from "./config.mjs";
import * as p from "./persistence.mjs";
import { broadcast } from "./websocket.mjs";

export function totals() {
  const r = p.totalsRow();
  const unwithdrawn = +(r.total - r.confirmed - r.pending).toFixed(3);
  return {
    total_km: +r.total.toFixed(3),
    confirmed_km: +r.confirmed.toFixed(3),
    pending_km: +r.pending.toFixed(3),
    unwithdrawn_km: unwithdrawn,
    cad_balance: +(unwithdrawn * config.cadPerKm).toFixed(2),
    cad_per_km: config.cadPerKm,
  };
}

// Spec rule: hide wallet card after the first confirmed withdrawal,
// unless the user has reset the override via Settings.
export function shouldHideWallet() {
  if (p.getState("ui:hideWalletOverride") === "0") return false;
  return p.countConfirmed() > 0;
}

export function createWithdrawal(now = Date.now()) {
  const candidates = p.unwithdrawnSessions();
  if (!candidates.length) return null;
  const km = +candidates.reduce((a, s) => a + s.km, 0).toFixed(3);
  if (km <= 0) return null;
  const cad = +(km * config.cadPerKm).toFixed(2);
  if (cad <= 0) return null;

  const w = {
    id: randomUUID(),
    km,
    cad,
    proof_token:
      randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""),
    created_ts: now,
    expires_ts: now + config.withdrawWindowMs,
  };

  const tx = p.transaction(() => {
    p.insertWithdrawal(w);
    p.lockSessionsToWithdrawal(
      candidates.map((s) => s.id),
      w.id
    );
  });
  tx();

  const stored = p.getWithdrawal(w.id);
  broadcast("withdrawal:pending", { withdrawal: stored });
  return { withdrawal: stored, sessions: candidates };
}

export function confirmWithdrawal(id, now = Date.now()) {
  const w = p.getWithdrawal(id);
  if (!w || w.status !== "pending") return null;
  if (now > w.expires_ts) return null;
  p.setWithdrawalStatus(id, "confirmed", now);
  const updated = p.getWithdrawal(id);
  broadcast("withdrawal:confirmed", { withdrawal: updated });
  return updated;
}

export function expireOverdue(now = Date.now()) {
  const overdue = p.pendingOverdue(now);
  if (!overdue.length) return 0;
  const tx = p.transaction(() => {
    for (const r of overdue) {
      p.setWithdrawalStatus(r.id, "expired");
      p.releaseSessionsFromWithdrawal(r.id);
    }
  });
  tx();
  for (const r of overdue) broadcast("withdrawal:expired", { id: r.id });
  return overdue.length;
}
