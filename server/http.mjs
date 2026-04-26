// All HTTP routes wired into one Express router. Each handler is small —
// anything non-trivial lives in reducer.mjs / sessions-service.mjs / sms.mjs.
import { Router } from "express";
import { config } from "./config.mjs";
import { requireAuth, signToken, checkOwnerLogin } from "./auth.mjs";
import {
  totals,
  shouldHideWallet,
  createWithdrawal,
  expireOverdue,
  confirmWithdrawal,
} from "./reducer.mjs";
import {
  importSession,
  listAll,
  syncFromXoss,
} from "./sessions-service.mjs";
import { parseCsv } from "./csv.mjs";
import {
  buildWithdrawSms,
  sendSms,
  isConfirmationBody,
  isAllowedSender,
} from "./sms.mjs";
import * as p from "./persistence.mjs";
import { renderProofPage } from "./proof-page.mjs";
import {
  checkBan,
  recordFail,
  recordSuccess,
  describeWait,
} from "./rate-limit.mjs";

// Best-effort client IP. Trusts X-Forwarded-For first (set `trust proxy` in
// server.mjs so Express populates req.ip from it).
function clientIp(req) {
  return (
    (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function buildRouter() {
  const r = Router();

  r.get("/api/health", (_req, res) => res.json({ ok: true }));

  r.post("/api/auth/login", (req, res) => {
    const ip = clientIp(req);
    const ban = checkBan(ip);
    if (ban.banned) {
      return res.status(429).json({
        error: `IP temporarily blocked. Try again in ${describeWait(ban.retryMs)}.`,
        retry_after_ms: ban.retryMs,
      });
    }
    const sub = checkOwnerLogin(req.body?.email, req.body?.password);
    if (!sub) {
      const rec = recordFail(ip);
      const remaining = Math.max(0, 5 - rec.fails);
      const justBanned = rec.banned_until && rec.banned_until > Date.now();
      if (justBanned) {
        return res.status(429).json({
          error: "Too many failed attempts. IP blocked for 24 hours.",
          retry_after_ms: rec.banned_until - Date.now(),
        });
      }
      return res.status(401).json({
        error: "invalid credentials",
        attempts_remaining: remaining,
      });
    }
    recordSuccess(ip);
    res.json({ token: signToken(sub), email: sub });
  });

  r.get("/api/balance", requireAuth, (_req, res) => {
    expireOverdue();
    res.json({ ...totals(), hide_wallet: shouldHideWallet() });
  });

  r.get("/api/sessions", requireAuth, (_req, res) => {
    res.json({ sessions: listAll() });
  });

  r.post("/api/sessions/import", requireAuth, (req, res) => {
    const body = req.body || {};
    let inputs = [];
    if (typeof body.csv === "string") inputs = parseCsv(body.csv);
    else if (Array.isArray(body.sessions)) inputs = body.sessions;
    else if (body.session) inputs = [body.session];
    else return res.status(400).json({ error: "no sessions provided" });
    const out = [];
    for (const i of inputs) {
      try {
        const s = importSession({
          source: i.source ?? "manual",
          external_id: i.external_id ?? null,
          start_ts:
            typeof i.start_ts === "string" ? Date.parse(i.start_ts) : i.start_ts,
          end_ts:
            typeof i.end_ts === "string" ? Date.parse(i.end_ts) : i.end_ts,
          km: parseFloat(i.km),
        });
        if (s) out.push(s);
      } catch (e) {
        out.push({ error: e.message });
      }
    }
    res.json({ imported: out.length, sessions: out });
  });

  r.post("/api/sessions/sync", requireAuth, async (_req, res) => {
    try {
      res.json({ added: await syncFromXoss() });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  r.post("/api/withdraw", requireAuth, async (_req, res) => {
    expireOverdue();
    const result = createWithdrawal();
    if (!result) return res.status(400).json({ error: "no unwithdrawn km" });
    const { withdrawal } = result;
    const proofUrl = `${config.publicUrl}/proof/${withdrawal.proof_token}`;
    const body = buildWithdrawSms({
      amountCad: withdrawal.cad,
      km: withdrawal.km,
      proofUrl,
    });
    let sid = null,
      dryRun = true;
    try {
      const r2 = await sendSms(config.payoutPhone, body);
      sid = r2.sid;
      dryRun = r2.dryRun;
    } catch (e) {
      p.setWithdrawalStatus(withdrawal.id, "failed");
      return res.status(502).json({ error: "sms send failed", detail: e.message });
    }
    p.setWithdrawalSms(withdrawal.id, sid, dryRun);
    res.json({
      withdrawal: { ...withdrawal, sms_sid: sid, sms_dry_run: dryRun ? 1 : 0 },
      sms_body: body,
      proof_url: proofUrl,
      dry_run: dryRun,
      sms_uri: `sms:${config.payoutPhone}?body=${encodeURIComponent(body)}`,
    });
  });

  r.get("/api/withdrawals", requireAuth, (_req, res) => {
    const list = p.listWithdrawals().map((w) => ({
      ...w,
      sessions: p.withdrawalSessions(w.id),
      proof_url: `${config.publicUrl}/proof/${w.proof_token}`,
    }));
    res.json({ withdrawals: list });
  });

  // Twilio inbound. Exact body "$" + allowed sender → confirms oldest pending.
  r.post("/api/webhook/sms", (req, res) => {
    const body = req.body?.Body ?? req.body?.body ?? "";
    const from = req.body?.From ?? req.body?.from ?? "";
    const now = Date.now();
    const inboundId = p.insertInboundSms(from, body, now);

    if (!isConfirmationBody(body) || !isAllowedSender(from)) {
      return res.type("text/xml").send("<Response/>");
    }
    const pending = p.oldestPendingActive(now);
    if (!pending) return res.type("text/xml").send("<Response/>");
    const confirmed = confirmWithdrawal(pending.id, now);
    if (confirmed) p.attachInboundMatch(inboundId, confirmed.id);
    res.type("text/xml").send("<Response/>");
  });

  r.get("/proof/:token", (req, res) => {
    const w = p.getWithdrawalByToken(req.params.token);
    if (!w) return res.status(404).type("text/plain").send("Not found.");
    res.type("text/html").send(renderProofPage(w, p.withdrawalSessions(w.id)));
  });

  // Settings: allow user to re-show the wallet card after first confirm.
  r.post("/api/settings/show-wallet", requireAuth, (_req, res) => {
    p.setState("ui:hideWalletOverride", "0");
    res.json({ ok: true });
  });

  return r;
}
