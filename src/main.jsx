import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/theme.css";

createRoot(document.getElementById("root")).render(<App />);

// PROD only — in dev the SW would race with Vite HMR and serve stale modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .catch(() => {});
  });
}
