import { useStore } from "../state/store.js";

export function Toast() {
  const t = useStore((s) => s.toast);
  if (!t) return null;
  return (
    <div className={`toast ${t.kind === "bad" ? "bad" : ""}`} key={t.ts}>
      {t.message}
    </div>
  );
}
