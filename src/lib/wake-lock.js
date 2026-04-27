/**
 * Keep the phone screen awake while BikePay is open.
 *
 * Two paths:
 *   1. Screen Wake Lock API — modern, battery-efficient, but only works in
 *      a secure context (https / localhost / installed PWA).
 *   2. NoSleep.js fallback — plays a tiny silent video to trick mobile
 *      browsers into staying awake. Required when the page is served over
 *      plain http on LAN (Wake Lock won't be available there).
 *
 * Both paths require a user gesture to start. The hook in use-wake-lock.js
 * arranges the gesture-on-first-tap.
 */
import NoSleep from "nosleep.js";

let lock = null;
let nosleep = null;
let active = false;
// Bumped each time the user disables — late-resolving enable() promises
// compare against this and bail out if they're stale.
let token = 0;

// Listener registered exactly once at module load (idempotent across hot
// re-renders that import this file repeatedly).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && active) {
    enable().catch(() => {});
  }
});

export async function enable() {
  if (active) return;
  active = true;
  const myToken = ++token;
  try {
    if ("wakeLock" in navigator) {
      const acquired = await navigator.wakeLock.request("screen");
      if (myToken !== token || !active) {
        // Disabled while we were awaiting — release immediately.
        try { acquired.release?.(); } catch {}
        return null;
      }
      lock = acquired;
      lock.addEventListener("release", () => {
        if (lock === acquired) lock = null;
      });
      return "wakeLock";
    }
  } catch {
    // Fall through to NoSleep.
  }
  if (myToken !== token || !active) return null;
  if (!nosleep) nosleep = new NoSleep();
  await nosleep.enable().catch(() => {});
  if (myToken !== token || !active) {
    try { nosleep?.disable?.(); } catch {}
    return null;
  }
  return "nosleep";
}

export function disable() {
  active = false;
  token++;
  try { lock?.release?.(); } catch {}
  lock = null;
  try { nosleep?.disable?.(); } catch {}
}
