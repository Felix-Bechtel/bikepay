import { useEffect, useState } from "react";
import { subscribe, state as installState } from "../lib/install-prompt.js";
import { Modal } from "./Modal.jsx";

// iPhone-only install button. Hidden on every other platform and when the
// app is already running standalone.
export function InstallIosButton() {
  const [s, setS] = useState(installState());
  const [open, setOpen] = useState(false);
  useEffect(() => subscribe(setS), []);

  if (!s.isIos || s.isStandalone) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "var(--primary)",
          color: "var(--on-primary)",
          fontWeight: 800,
          fontSize: ".8rem",
          padding: ".4rem .75rem",
          borderRadius: 999,
          border: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: ".3rem",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Install
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 style={{ marginTop: 0 }}>Install BikePay on iPhone</h2>
        <ol style={{ paddingLeft: "1.2rem", lineHeight: 1.7, fontSize: ".95rem" }}>
          <li>Tap the <strong>Share</strong> button (the box with the up-arrow ↑) at the bottom of Safari.</li>
          <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top-right corner.</li>
        </ol>
        <p className="muted" style={{ fontSize: ".82rem", marginTop: ".75rem" }}>
          You'll get a real BikePay icon on your home screen. The app opens
          fullscreen, no Safari address bar, and your data stays on this phone.
        </p>
        <button className="btn" style={{ marginTop: ".5rem" }} onClick={() => setOpen(false)}>
          Got it
        </button>
      </Modal>
    </>
  );
}
