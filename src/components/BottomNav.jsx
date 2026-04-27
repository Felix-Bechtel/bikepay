import { useStore } from "../state/store.js";
import { showScreen } from "../state/actions.js";
import { SCREEN } from "../constants.js";

const ITEMS = [
  { id: SCREEN.dashboard, label: "Home", icon: HomeIcon },
  { id: SCREEN.rides, label: "Rides", icon: BikeIcon },
  { id: SCREEN.wallet, label: "Wallet", icon: WalletIcon },
  { id: SCREEN.settings, label: "Settings", icon: GearIcon },
];

export function BottomNav() {
  const screen = useStore((s) => s.screen);
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        padding:
          ".4rem env(safe-area-inset-right) calc(.4rem + env(safe-area-inset-bottom)) env(safe-area-inset-left)",
        background: "rgba(6,14,32,.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--line)",
        maxWidth: "42rem",
        margin: "0 auto",
      }}
    >
      {ITEMS.map((it) => {
        const active = screen === it.id;
        return (
          <button
            key={it.id}
            onClick={() => showScreen(it.id)}
            style={{
              background: "transparent",
              border: 0,
              padding: ".55rem 0",
              color: active ? "var(--primary)" : "var(--dim)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
            }}
          >
            <it.icon active={active} />
            <span style={{ fontSize: ".68rem", fontWeight: 700 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <NavSvg fill={active ? "currentColor" : "none"}>
      <path d="M3 12 12 4l9 8M5 10v10h14V10" />
    </NavSvg>
  );
}
function BikeIcon() {
  return (
    <NavSvg>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 18 12 6h4M14 6h4l2 6" />
    </NavSvg>
  );
}
function WalletIcon() {
  return (
    <NavSvg>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </NavSvg>
  );
}
function GearIcon() {
  return (
    <NavSvg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </NavSvg>
  );
}

function NavSvg({ fill = "none", children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2">
      {children}
    </svg>
  );
}
