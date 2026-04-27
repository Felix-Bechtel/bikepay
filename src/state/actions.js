import { setState, getState, rehydrateFromAccount } from "./store.js";
import {
  signup as authSignup,
  login as authLogin,
  logoutLocal,
  setAccountData,
  updateProfile as authUpdateProfile,
  changePassword as authChangePassword,
  deleteAccount as authDeleteAccount,
  newId,
  randomHex,
} from "../lib/auth-local.js";
import { computeBalance } from "../lib/compute.js";
import { buildWithdrawSms } from "../lib/sms-body.js";
import { parseCsv } from "../lib/csv.js";
import { WITHDRAW_WINDOW_MS, WITHDRAWAL_STATUS } from "../constants.js";

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

export function saveProfile(patch) {
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

function persistData(data) {
  const id = getState().currentAccount?.id;
  if (id) setAccountData(id, data);
  setState({ data });
}

export function startWithdrawal() {
  const s = getState();
  const acc = s.currentAccount;
  if (!acc) return;
  const t = computeBalance(s.data);
  if (t.unwithdrawn_km <= 0) return toast("Nothing to withdraw", "bad");

  const id = newId();
  const now = Date.now();
  const ssAvail = s.data.sessions.filter((x) => !x.withdrawal_id);
  const sessions = s.data.sessions.map((x) =>
    !x.withdrawal_id ? { ...x, withdrawal_id: id } : x
  );
  const w = {
    id,
    km: t.unwithdrawn_km,
    cad: t.cad_balance,
    status: WITHDRAWAL_STATUS.pending,
    proof_token: randomHex(32),
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
  persistData({
    ...s.data,
    sessions,
    withdrawals: [w, ...s.data.withdrawals],
  });

  const body = buildWithdrawSms({
    name: acc.name,
    amountCad: t.cad_balance,
    km: t.unwithdrawn_km,
    proofUrl: "(local proof — open BikePay to view)",
  });
  location.href = `sms:${acc.payoutPhone}?body=${encodeURIComponent(body)}`;
}

export function localConfirm(id) {
  const s = getState();
  const w = s.data.withdrawals.find((x) => x.id === id);
  if (!w || w.status !== WITHDRAWAL_STATUS.pending) return;
  if (Date.now() > w.expires_ts) return toast("Already expired", "bad");
  persistData({
    ...s.data,
    withdrawals: s.data.withdrawals.map((x) =>
      x.id === id
        ? { ...x, status: WITHDRAWAL_STATUS.confirmed, confirmed_ts: Date.now() }
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
    if (w.status === WITHDRAWAL_STATUS.pending && w.expires_ts <= now) {
      changed = true;
      return { ...w, status: WITHDRAWAL_STATUS.expired };
    }
    return w;
  });
  if (!changed) return;
  const expiredIds = new Set(
    withdrawals
      .filter((w) => w.status === WITHDRAWAL_STATUS.expired)
      .map((w) => w.id)
  );
  const sessions = s.data.sessions.map((x) =>
    expiredIds.has(x.withdrawal_id) ? { ...x, withdrawal_id: null } : x
  );
  persistData({ ...s.data, sessions, withdrawals });
}

export function addManualSession({ start_ts, end_ts, km }) {
  const s = getState();
  if (!s.currentAccount) return;
  persistData({
    ...s.data,
    sessions: [
      {
        id: newId(),
        source: "manual",
        external_id: null,
        start_ts,
        end_ts,
        km,
        withdrawal_id: null,
      },
      ...s.data.sessions,
    ],
  });
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
    added.push({ ...row, id: newId(), withdrawal_id: null });
  }
  persistData({ ...s.data, sessions: [...added, ...s.data.sessions] });
  toast(`Imported ${added.length}`);
}

// Re-show the wallet card on the active account (was hidden after first
// confirmed withdrawal per spec).
export function resetWalletOverride() {
  const s = getState();
  if (!s.currentAccount) return;
  if (!s.data.hideWallet) return;
  persistData({ ...s.data, hideWallet: false });
}
