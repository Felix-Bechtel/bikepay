import { setState, getState, rehydrateFromAccount } from "./store.js";
import {
  signup as authSignup,
  login as authLogin,
  logoutLocal,
  setAccountData,
  updateProfile as authUpdateProfile,
  changePassword as authChangePassword,
  deleteAccount as authDeleteAccount,
} from "../lib/auth-local.js";
import { computeBalance } from "../lib/compute.js";
import { buildWithdrawSms } from "../lib/sms-body.js";
import { parseCsv } from "../lib/csv.js";
import { WITHDRAW_WINDOW_MS, STORAGE_KEYS } from "../constants.js";

// ---------- screen / toast ----------

export function showScreen(screen) {
  setState({ screen });
}

export function showAuthView(authView) {
  setState({ authView });
}

export function toast(message, kind = "ok") {
  setState({ toast: { message, kind, ts: Date.now() } });
  setTimeout(() => {
    if (getState().toast?.message === message) setState({ toast: null });
  }, 2200);
}

// ---------- auth ----------

export async function doSignup(form) {
  await authSignup(form);
  rehydrateFromAccount();
  setState({ screen: "dashboard" });
  toast(`Welcome, ${form.name.split(" ")[0]}`);
}

export async function doLogin({ email, password }) {
  await authLogin({ email, password });
  rehydrateFromAccount();
  setState({ screen: "dashboard" });
}

export function doLogout() {
  logoutLocal();
  setState({ screen: "login", authView: "login", currentAccount: null });
}

export async function saveProfile(patch) {
  const id = getState().currentAccount?.id;
  if (!id) return;
  authUpdateProfile(id, patch);
  rehydrateFromAccount();
  toast("Profile saved");
}

export async function changePassword(oldPw, newPw) {
  const id = getState().currentAccount?.id;
  if (!id) return;
  await authChangePassword(id, oldPw, newPw);
  toast("Password updated");
}

export function removeAccount() {
  const id = getState().currentAccount?.id;
  if (!id) return;
  authDeleteAccount(id);
  doLogout();
  toast("Account deleted");
}

// ---------- data persistence ----------

function persistData(data) {
  const id = getState().currentAccount?.id;
  if (id) setAccountData(id, data);
  setState({ data });
}

// ---------- withdrawal ----------

export function startWithdrawal() {
  const s = getState();
  const acc = s.currentAccount;
  if (!acc) return;
  const t = computeBalance(s.data);
  if (t.unwithdrawn_km <= 0) return toast("Nothing to withdraw", "bad");
  const id = uuid();
  const now = Date.now();
  const ssAvail = s.data.sessions.filter((x) => !x.withdrawal_id);
  const sessions = s.data.sessions.map((x) =>
    !x.withdrawal_id ? { ...x, withdrawal_id: id } : x
  );
  const w = {
    id,
    km: t.unwithdrawn_km,
    cad: t.cad_balance,
    status: "pending",
    proof_token: uuid().replace(/-/g, "") + uuid().replace(/-/g, ""),
    created_ts: now,
    expires_ts: now + WITHDRAW_WINDOW_MS,
    confirmed_ts: null,
    sessions: ssAvail.map((x) => ({
      id: x.id,
      km: x.km,
      start_ts: x.start_ts,
      end_ts: x.end_ts,
    })),
  };
  const data = {
    ...s.data,
    sessions,
    withdrawals: [w, ...s.data.withdrawals],
  };
  persistData(data);
  const body = buildWithdrawSms({
    name: acc.name,
    amountCad: t.cad_balance,
    km: t.unwithdrawn_km,
    proofUrl: "(local proof — open BikePay to view)",
  });
  // Open the phone's native SMS composer pre-filled.
  location.href = `sms:${acc.payoutPhone}?body=${encodeURIComponent(body)}`;
}

export function localConfirm(id) {
  const s = getState();
  const w = s.data.withdrawals.find((x) => x.id === id);
  if (!w || w.status !== "pending") return;
  if (Date.now() > w.expires_ts) return toast("Already expired", "bad");
  persistData({
    ...s.data,
    withdrawals: s.data.withdrawals.map((x) =>
      x.id === id
        ? { ...x, status: "confirmed", confirmed_ts: Date.now() }
        : x
    ),
    hideWallet: true,
  });
  toast("Marked confirmed");
}

export function localExpireSweep() {
  const s = getState();
  if (!s.currentAccount) return;
  const now = Date.now();
  let changed = false;
  const withdrawals = s.data.withdrawals.map((w) => {
    if (w.status === "pending" && w.expires_ts <= now) {
      changed = true;
      return { ...w, status: "expired" };
    }
    return w;
  });
  if (!changed) return;
  const expiredIds = new Set(
    withdrawals.filter((w) => w.status === "expired").map((w) => w.id)
  );
  const sessions = s.data.sessions.map((x) =>
    expiredIds.has(x.withdrawal_id) ? { ...x, withdrawal_id: null } : x
  );
  persistData({ ...s.data, sessions, withdrawals });
}

// ---------- sessions ----------

export function addManualSession({ start_ts, end_ts, km }) {
  const s = getState();
  if (!s.currentAccount) return;
  const data = {
    ...s.data,
    sessions: [
      {
        id: uuid(),
        source: "manual",
        external_id: null,
        start_ts,
        end_ts,
        km,
        withdrawal_id: null,
      },
      ...s.data.sessions,
    ],
  };
  persistData(data);
  toast("Added");
}

export function importCsv(csv) {
  const s = getState();
  if (!s.currentAccount) return;
  const rows = parseCsv(csv);
  const known = new Set(
    s.data.sessions.map((x) => x.external_id).filter(Boolean)
  );
  const added = [];
  for (const row of rows) {
    if (row.external_id && known.has(row.external_id)) continue;
    added.push({ ...row, id: uuid(), withdrawal_id: null });
  }
  persistData({ ...s.data, sessions: [...added, ...s.data.sessions] });
  toast(`Imported ${added.length}`);
}

export function resetWalletOverride() {
  setState({ walletResetOverride: true });
  localStorage.setItem(STORAGE_KEYS.walletReset, "1");
}

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();
}
