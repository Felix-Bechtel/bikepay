import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard.jsx";
import { subscribe, promptInstall, state as installState } from "../lib/install-prompt.js";

const DISMISS_KEY = "bk:install-dismissed";

// Banner you can drop on Dashboard. Hides itself if already installed or
// the user dismissed it.
export function InstallCard({ compact = false }) {
  const [s, setS] = useState(installState());
  const [dismissed, setDismissed] = useState(
    localStorage.getItem(DISMISS_KEY) === "1"
  );
  useEffect(() => subscribe(setS), []);

  if (s.isStandalone) return null;
  if (dismissed && compact) return null;

  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg,var(--primary),var(--secondary))",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            color: "var(--on-primary)",
            flex: "0 0 auto",
          }}
        >
          ↓
        </div>
        <div className="grow">
          <div style={{ fontWeight: 700 }}>Install BikePay</div>
          <div className="muted" style={{ fontSize: ".8rem" }}>
            Add to home screen — runs offline, no browser bar.
          </div>
        </div>
      </div>

      {s.canPrompt && (
        <button className="btn small" style={{ marginTop: ".75rem" }} onClick={promptInstall}>
          Install app
        </button>
      )}

      {!s.canPrompt && s.isIos && (
        <ol
          style={{
            marginTop: ".75rem",
            paddingLeft: "1.2rem",
            color: "var(--text)",
            fontSize: ".85rem",
            lineHeight: 1.6,
          }}
        >
          <li>Tap the <strong>Share</strong> button (the box with the up-arrow).</li>
          <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top-right.</li>
        </ol>
      )}

      {!s.canPrompt && !s.isIos && (
        <div className="muted" style={{ fontSize: ".82rem", marginTop: ".7rem", lineHeight: 1.5 }}>
          Open the browser menu (⋮) and choose <strong>Install app</strong> or
          <strong> Add to Home screen</strong>. If you don't see it, the
          install option needs HTTPS — open this site over https or deploy it
          to a static host (Netlify / Vercel / Cloudflare Pages).
        </div>
      )}

      {compact && (
        <button
          className="btn small secondary"
          style={{ marginTop: ".5rem" }}
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          Not now
        </button>
      )}
    </GlassCard>
  );
}
