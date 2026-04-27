// Single source of truth for client-side constants.

// 1 km = 10 cents CAD.
export const CAD_PER_KM = 0.10;

export const WITHDRAW_WINDOW_MS = 24 * 60 * 60 * 1000;

// Each account stores its own payout phone + name in localStorage. There is
// no project-wide PAYOUT_PHONE constant — see src/lib/auth-local.js.

export const SCREEN = {
  dashboard: "dashboard",
  rides: "rides",
  wallet: "wallet",
  settings: "settings",
};

// Values must match the CSS classes in styles/theme.css (.pill.pending etc.).
export const WITHDRAWAL_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  expired: "expired",
  failed: "failed",
};
