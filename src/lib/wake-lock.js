import NoSleep from "nosleep.js";

/**
 * Keep the phone screen awake while the BikePay app is open.
 *
 * Two paths:
 *   1. Screen Wake Lock API — modern, battery-efficient, but only works in
 *      a secure context (https / localhost / installed PWA).
 *   2. NoSleep.js fallback — plays a tiny silent video to trick mobile
 *      browsers into staying awake. Works over plain http on LAN, which is
 *      what we need when the phone hits http://192.168.x.x:5173/.
 *
 * Both paths require a user gesture to start. The hook below wires that up.
 */

let lock = null;
let nosleep = null;
let active = false;

export function isSupported() {
  return "wakeLock" in navigator || typeof Audio !== "undefined";
}

export async function enable() {
  if (active) return;
  active = true;
  try {
    if ("wakeLock" in navigator) {
      lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => {
        lock = null;
      });
      return "wakeLock";
    }
  } catch {
    // Fall through to NoSleep below.
  }
  if (!nosleep) nosleep = new NoSleep();
  await nosleep.enable().catch(() => {});
  return "nosleep";
}

export function disable() {
  active = false;
  try {
    lock?.release?.();
  } catch {}
  lock = null;
  try {
    nosleep?.disable?.();
  } catch {}
}

// Native Wake Lock drops itself when the page goes to the background.
// We re-acquire it when the user comes back.
export function attachAutoReacquire() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && active) {
      enable().catch(() => {});
    }
  });
}
