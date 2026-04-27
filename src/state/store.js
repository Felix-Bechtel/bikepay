import { useSyncExternalStore } from "react";
import { getCurrentId, findAccount } from "../lib/auth-local.js";

// Components subscribe via useStore(selector). Mutations go through actions.js
// which writes both to this in-memory state and to localStorage via
// auth-local. The store itself never persists raw data.

let state = bootInitial();
const listeners = new Set();

function bootInitial() {
  const id = getCurrentId();
  const acc = id ? findAccount(id) : null;
  return {
    currentAccount: acc ? publicAccount(acc) : null,
    data: acc?.data || { sessions: [], withdrawals: [], hideWallet: false },
    screen: acc ? "dashboard" : "login",
    authView: "login",
    toast: null,
  };
}

function publicAccount(a) {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    payoutPhone: a.payoutPhone,
    createdTs: a.createdTs,
  };
}

export function getState() {
  return state;
}

export function setState(patch) {
  state = typeof patch === "function" ? patch(state) : { ...state, ...patch };
  for (const l of listeners) l();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// IMPORTANT: getSnapshot must return a stable reference between calls when
// state is unchanged. We snapshot the whole state and apply selectors after,
// so React 18's useSyncExternalStore contract is satisfied.
export function useStore(selector = (s) => s) {
  const snap = useSyncExternalStore(subscribe, getState, getState);
  return selector(snap);
}

// One read of the accounts blob is enough; account.data is in-line.
export function rehydrateFromAccount() {
  const id = getCurrentId();
  if (!id) return resetSession();
  const acc = findAccount(id);
  if (!acc) return resetSession();
  setState({
    currentAccount: publicAccount(acc),
    data: acc.data || { sessions: [], withdrawals: [], hideWallet: false },
  });
}

function resetSession() {
  setState({
    currentAccount: null,
    data: { sessions: [], withdrawals: [], hideWallet: false },
    screen: "login",
  });
}
