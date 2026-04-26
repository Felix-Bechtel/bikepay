import { useState } from "react";
import { useStore } from "../state/store.js";
import { GlassCard } from "../components/GlassCard.jsx";
import { InstallCard } from "../components/InstallCard.jsx";
import { ManualSessionForm } from "../admin/widgets/ManualSessionForm.jsx";
import { CsvImporter } from "../admin/widgets/CsvImporter.jsx";
import { DeveloperSection } from "../admin/sections/DeveloperSection.jsx";
import {
  doLogout,
  resetWalletOverride,
  saveProfile,
  changePassword,
  removeAccount,
  toast,
} from "../state/actions.js";
import { CAD_PER_KM } from "../constants.js";
import { formatPhone } from "../lib/auth-local.js";

export function SettingsPage() {
  const acc = useStore((s) => s.currentAccount);
  if (!acc) return null;
  return (
    <div className="app-shell stack">
      <GlassCard>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Settings</h1>
        <div className="muted" style={{ fontSize: ".85rem", marginTop: ".25rem" }}>
          Profile, security, imports, developer tools.
        </div>
      </GlassCard>

      <InstallCard />
      <ProfileCard account={acc} />
      <PasswordCard />

      <GlassCard>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Preferences</h2>
        <Row label="Rate" value={`$${CAD_PER_KM.toFixed(2)} / km`} />
        <Row label="Storage" value="On this device only" />
        <div className="row" style={{ marginTop: ".75rem", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="btn small secondary" onClick={resetWalletOverride}>
            Re-show wallet
          </button>
          <button className="btn small secondary" onClick={doLogout}>
            Sign out
          </button>
          <button
            className="btn small danger"
            onClick={() => {
              if (confirm("Delete this account and all its data on this device?")) {
                removeAccount();
              }
            }}
          >
            Delete account
          </button>
        </div>
      </GlassCard>

      <ManualSessionForm />
      <CsvImporter />
      <DeveloperSection />
    </div>
  );
}

function ProfileCard({ account }) {
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.payoutPhone);
  return (
    <GlassCard>
      <h2 style={{ margin: 0, fontSize: "1rem" }}>Profile</h2>
      <Row label="Email" value={account.email} />
      <Row label="Phone" value={formatPhone(account.payoutPhone)} />
      <label>Display name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <label>Payout phone</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" />
      <div style={{ height: ".5rem" }} />
      <button className="btn small" onClick={() => saveProfile({ name, payoutPhone: phone })}>
        Save profile
      </button>
    </GlassCard>
  );
}

function PasswordCard() {
  const [oldPw, setOld] = useState("");
  const [newPw, setNew] = useState("");
  return (
    <GlassCard>
      <h2 style={{ margin: 0, fontSize: "1rem" }}>Change password</h2>
      <label>Current</label>
      <input type="password" value={oldPw} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" />
      <label>New</label>
      <input type="password" value={newPw} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
      <div style={{ height: ".5rem" }} />
      <button
        className="btn small"
        onClick={async () => {
          try {
            await changePassword(oldPw, newPw);
            setOld(""); setNew("");
          } catch (e) {
            toast(e.message, "bad");
          }
        }}
      >
        Update password
      </button>
    </GlassCard>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: ".4rem 0", fontSize: ".9rem" }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
