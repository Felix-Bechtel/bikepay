// Capture the browser's installability state.
//
//   - Chrome / Edge (Android, desktop) fire `beforeinstallprompt` once. We
//     stash the event so the user can trigger the native install dialog
//     later by pressing our "Install" button.
//   - iOS Safari has no programmatic install. The user has to tap Share →
//     "Add to Home Screen". We detect iOS and let the UI show instructions.
//   - When the page is already running standalone, we report "installed".

let deferred = null;
const listeners = new Set();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  fire();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  fire();
});

function fire() {
  for (const fn of listeners) fn(state());
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state());
  return () => listeners.delete(fn);
}

export function state() {
  return {
    canPrompt: !!deferred,
    isStandalone: isStandaloneMode(),
    isIos: isIosSafari(),
  };
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
  deferred = null;
  fire();
  return choice.outcome === "accepted";
}

function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua);
  // exclude in-app browsers that pretend to be Safari (FB / IG can't install)
  const safariish = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safariish;
}
