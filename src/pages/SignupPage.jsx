import { useState } from "react";
import { GlassCard } from "../components/GlassCard.jsx";
import { doSignup, showAuthView, toast } from "../state/actions.js";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await doSignup({ name, email, password, payoutPhone });
    } catch (err) {
      toast(err.message || "Sign up failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <GlassCard>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Create account</h1>
        <p className="muted" style={{ fontSize: ".9rem", marginTop: ".25rem" }}>
          Your data lives only on this device.
        </p>
        <form onSubmit={submit} autoComplete="on">
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="off"
            inputMode="email"
            required
          />

          <label>Payout phone (your number)</label>
          <input
            type="tel"
            value={payoutPhone}
            onChange={(e) => setPayoutPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
            inputMode="tel"
            required
          />
          <div className="muted" style={{ fontSize: ".75rem", marginTop: ".25rem" }}>
            This is the number that receives your withdrawal SMS.
          </div>

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <div className="muted" style={{ fontSize: ".75rem", marginTop: ".25rem" }}>
            6+ characters. Stored hashed (PBKDF2) on this device only.
          </div>

          <div style={{ height: ".9rem" }} />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="hr" />
        <button className="btn secondary" onClick={() => showAuthView("login")}>
          I already have an account
        </button>
      </GlassCard>
    </div>
  );
}
