import { GlassCard } from "../../components/GlassCard.jsx";
import { CodeViewer } from "../widgets/CodeViewer.jsx";
import { CAD_PER_KM, WITHDRAW_WINDOW_MS } from "../../constants.js";
import { useStore } from "../../state/store.js";
import { formatPhone } from "../../lib/auth-local.js";

// Live constants the running account is using.
export function DeveloperSection() {
  const account = useStore((s) => s.currentAccount);
  const snippet = `// Active account — local only
name:         "${account?.name ?? ""}"
email:        "${account?.email ?? ""}"
payoutPhone:  "${formatPhone(account?.payoutPhone)}"

// src/constants.js
CAD_PER_KM         = ${CAD_PER_KM}
WITHDRAW_WINDOW_MS = ${WITHDRAW_WINDOW_MS} // 24h`;
  return (
    <GlassCard>
      <h2 style={{ margin: 0, fontSize: "1rem" }}>Developer view</h2>
      <div className="muted" style={{ fontSize: ".85rem", marginTop: ".25rem" }}>
        Live constants + active account.
      </div>
      <CodeViewer title="state" code={snippet} />
    </GlassCard>
  );
}
