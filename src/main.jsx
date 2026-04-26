import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/theme.css";

createRoot(document.getElementById("root")).render(<App />);

// Register the service worker. Use BASE_URL so the app works at both
// http://host/ (dev) and https://host/bikepay/ (GitHub Pages).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .catch(() => {});
  });
}
