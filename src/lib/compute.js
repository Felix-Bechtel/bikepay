import { CAD_PER_KM } from "../constants.js";

// Pure: given sessions + withdrawals, return the balance shape used by the UI.
// Identical formula to server/reducer.mjs#totals so server-mode and standalone
// match.
export function computeBalance({ sessions = [], withdrawals = [] }) {
  const wMap = new Map(withdrawals.map((w) => [w.id, w]));
  let total = 0,
    pending = 0,
    confirmed = 0;
  for (const s of sessions) {
    total += s.km;
    const w = s.withdrawal_id ? wMap.get(s.withdrawal_id) : null;
    if (w?.status === "pending") pending += s.km;
    else if (w?.status === "confirmed") confirmed += s.km;
  }
  const unwithdrawn = +(total - pending - confirmed).toFixed(3);
  return {
    total_km: +total.toFixed(2),
    pending_km: +pending.toFixed(2),
    confirmed_km: +confirmed.toFixed(2),
    unwithdrawn_km: unwithdrawn,
    cad_balance: +(unwithdrawn * CAD_PER_KM).toFixed(2),
    cad_per_km: CAD_PER_KM,
  };
}

// Spec: hide wallet card after the first confirmed withdrawal, unless the
// user reset that override.
export function shouldHideWallet({ withdrawals = [], walletResetOverride = false }) {
  if (walletResetOverride) return false;
  return withdrawals.some((w) => w.status === "confirmed");
}
