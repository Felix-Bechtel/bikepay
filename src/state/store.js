import { useSyncExternalStore } from "react";
import {
  getCurrentId,
  findAccount,
  getAccountData,
} from "../lib/auth-local.js";

// One small external store. Components subscribe via useStore(selector).
//
// Every action that mutates a logged-in user's data goes through actions.js,
// which writes both to this in-memory state AND to localStorage via the
// auth-local helpers. The store never persists raw data on its own.

let state = bootInitial();
const listeners = new Set();

function bootInitial() {
  const id = getCurrentId();
  const acc = id ? findAccount(id) : null;
  return {
    currentAccount: acc
      ? {
          id: acc.id,
          email: acc.email,
          name: acc.name,
          payoutPhone: acc.payoutPhone,
          createdTs: acc.createdTs,
        }
      : null,
    data: acc ? acc.data : { sessions: [], withdrawals: [], hideWallet: false },
    screen: acc ? "dashboard" : "login",
    authView: "login", // login | signup
    toast: null,
    walletResetOverride: localStorage.getItem("bk:walletReset") === "1",
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
// state is unchanged. We snapshot the whole state and apply the selector
// after, so React 18's useSyncExternalStore contract is satisfied.
export function useStore(selector = (s) => s) {
  const snap = useSyncExternalStore(subscribe, getState, getState);
  return selector(snap);
}

// Reload the in-memory account snapshot + data after auth-local mutations.
export function rehydrateFromAccount() {
  const id = getCurrentId();
  if (!id) {
    setState({ currentAccount: null, data: { sessions: [], withdrawals: [], hideWallet: false }, screen: "login" });
    return;
  }
  const acc = findAccount(id);
  if (!acc) {
    setState({ currentAccount: null, data: { sessions: [], withdrawals: [], hideWallet: false }, screen: "login" });
    return;
  }
  setState({
    currentAccount: {
      id: acc.id,
      email: acc.email,
      name: acc.name,
      payoutPhone: acc.payoutPhone,
      createdTs: acc.createdTs,
    },
    data: getAccountData(acc.id),
  });
}
