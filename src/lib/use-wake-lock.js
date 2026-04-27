import { useEffect, useState } from "react";
import { enable, disable } from "./wake-lock.js";

// Hook: keep the screen awake while `enabled` is true. Returns the active
// backend ("wakeLock" / "nosleep" / null) so callers can show what's working.
export function useWakeLock(enabled = true) {
  const [backend, setBackend] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const apply = (b) => { if (!cancelled) setBackend(b ?? null); };
    enable().then(apply);
    // Some platforms only honor the lock after a user gesture — re-trigger
    // on the first tap as well.
    const onTap = () => enable().then(apply);
    document.addEventListener("pointerdown", onTap, { once: true });
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onTap);
      disable();
    };
  }, [enabled]);
  return backend;
}
