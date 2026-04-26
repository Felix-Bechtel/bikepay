import { useEffect, useState } from "react";
import { enable, disable, attachAutoReacquire } from "./wake-lock.js";

// Hook: keep the screen awake. Returns the current backend ("wakeLock",
// "nosleep", or null) so the UI can show what's active.
export function useWakeLock(enabled = true) {
  const [backend, setBackend] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    attachAutoReacquire();
    // Native Wake Lock: try silently; many browsers actually allow without a
    // gesture once the document is loaded.
    enable().then((b) => {
      if (!cancelled) setBackend(b ?? null);
    });
    // NoSleep specifically requires a user gesture, so re-enable on first
    // pointerdown if our silent attempt didn't fire it.
    const onTap = () => {
      enable().then((b) => {
        if (!cancelled) setBackend(b ?? null);
      });
    };
    document.addEventListener("pointerdown", onTap, { once: true });
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onTap);
      disable();
    };
  }, [enabled]);
  return backend;
}
