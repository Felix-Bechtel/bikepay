// Single source of truth for client-side constants.

// 1 km = 10 cents CAD.
export const CAD_PER_KM = 0.10;

// Each account stores its own payout phone + name in localStorage. There is
// no project-wide PAYOUT_PHONE constant any more — see src/lib/auth-local.js.

export const WITHDRAW_WINDOW_MS = 24 * 60 * 60 * 1000;

export const SCREENS = ["dashboard", "rides", "wallet", "settings"];

export const STORAGE_KEYS = {
  walletReset: "bk:walletReset",
};
