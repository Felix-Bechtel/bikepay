// Thin fetch wrapper. The store passes server URL + token in.
export function makeApi({ server, token }) {
  const base = (server || "").replace(/\/$/, "");
  async function req(path, opts = {}) {
    const r = await fetch(base + path, {
      ...opts,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...(opts.headers || {}),
      },
    });
    if (!r.ok) {
      // Try JSON first so server-provided `error` fields surface cleanly.
      const text = await r.text().catch(() => "");
      let msg = r.statusText;
      let body = null;
      try {
        body = JSON.parse(text);
        if (body?.error) msg = body.error;
      } catch {
        if (text) msg = text;
      }
      const err = new Error(msg);
      err.status = r.status;
      err.body = body;
      throw err;
    }
    return r.headers.get("content-type")?.includes("json") ? r.json() : r.text();
  }
  return {
    base,
    login: (email, password) =>
      req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    balance: () => req("/api/balance"),
    sessions: () => req("/api/sessions"),
    importSession: (session) =>
      req("/api/sessions/import", {
        method: "POST",
        body: JSON.stringify({ session }),
      }),
    importCsv: (csv) =>
      req("/api/sessions/import", {
        method: "POST",
        body: JSON.stringify({ csv }),
      }),
    syncXoss: () => req("/api/sessions/sync", { method: "POST" }),
    withdraw: () => req("/api/withdraw", { method: "POST", body: "{}" }),
    withdrawals: () => req("/api/withdrawals"),
    showWallet: () =>
      req("/api/settings/show-wallet", { method: "POST", body: "{}" }),
  };
}
