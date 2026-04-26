import { useStore } from "../state/store.js";
import { InstallIosButton } from "./InstallIosButton.jsx";

export function TopBar() {
  const account = useStore((s) => s.currentAccount);
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: ".75rem",
        padding: "0 1.25rem",
        background: "rgba(11,19,38,.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--line)",
        maxWidth: "42rem",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "linear-gradient(135deg,var(--primary),var(--secondary))",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          color: "var(--on-primary)",
        }}
      >
        $
      </div>
      <span
        style={{
          fontWeight: 800,
          fontSize: "1.15rem",
          letterSpacing: "-.01em",
          color: "var(--primary)",
        }}
      >
        BikePay
      </span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".6rem" }}>
        <InstallIosButton />
        <span style={{ fontSize: ".8rem", color: "var(--dim)" }}>
          {account?.name?.split(" ")[0] ?? ""}
        </span>
      </div>
    </header>
  );
}
