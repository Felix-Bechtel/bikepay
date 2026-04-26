import { useState } from "react";
import { GlassCard } from "../components/GlassCard.jsx";
import { doLogin, showAuthView, toast } from "../state/actions.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await doLogin({ email: email.trim(), password });
    } catch (err) {
      toast(err.message || "Sign in failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <GlassCard>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Welcome back</h1>
        <p className="muted" style={{ fontSize: ".9rem", marginTop: ".25rem" }}>
          Sign in to your BikePay account.
        </p>
        <form onSubmit={submit} autoComplete="on">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            inputMode="email"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <div style={{ height: ".75rem" }} />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="hr" />
        <button className="btn secondary" onClick={() => showAuthView("signup")}>
          Create an account
        </button>
      </GlassCard>
    </div>
  );
}
