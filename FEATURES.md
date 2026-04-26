# BikePay — Feature Reference

The same content as the previous release, refreshed for the new structure and
the **$0.10 / km** rate. Every feature lives in a specific file — paths below.

## 1. Core concept

| Term            | Meaning                                                                            | Source-of-truth file                |
| --------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| **Session**     | One ride from XOSS G+ / CSV / BLE / manual.                                       | `server/persistence.mjs`            |
| **Total km**    | Sum of all sessions, ever.                                                         | `server/reducer.mjs#totals`         |
| **Unwithdrawn** | km not yet locked into a pending or confirmed withdrawal.                          | `server/reducer.mjs#totals`         |
| **Pending**     | Withdrawal awaiting `$` reply within 24h.                                          | `server/reducer.mjs#createWithdrawal` |
| **Confirmed**   | `$` arrived in time → cashed out.                                                  | `server/reducer.mjs#confirmWithdrawal` |
| **Expired**     | 24h elapsed without `$` → km return to unwithdrawn.                                | `server/reducer.mjs#expireOverdue`  |
| **CAD balance** | `unwithdrawn_km × 0.10`.                                                           | `src/constants.js` + `server/config.mjs` |

SMS body (verbatim):

```
Felix has withdrawn $<AMOUNT> (<KM> km). Send $<AMOUNT> to his bank. Proof: <short link>. Reply with a single '$' within 24 hours to confirm.
```

Built by `server/sms.mjs#buildWithdrawSms` (server-mode) and
`src/lib/sms-body.js#buildWithdrawSms` (standalone).

Recipient: `+1 (519) 496-0491`.

---

## 2. Architecture

```
┌────────────┐  HTTPS/JSON     ┌────────────────────┐    Twilio    ┌────────────┐
│  React PWA │ ───────────────►│  StitchMCP API     │ ───────────► │ Payout SMS │
│ (src/)     │ ◄─── SSE ───────│  (server/*.mjs)    │ ◄── webhook  │ (replies)  │
└────────────┘                 └────────────────────┘              └────────────┘
```

Frontend: `src/`. Backend: `server/`. **Zero cross-imports** — only JSON.

---

## 3. Screens (SPA)

### 3.1 Dashboard — `src/pages/DashboardPage.jsx`
- Hero: total km + 1500 km milestone progress.
- Wallet card: unwithdrawn km, rate ($0.10/km), CAD balance, Withdraw button.
- After first **confirmed** withdrawal, the wallet card hides itself (spec rule). Re-show via Settings.
- Pending list rendered via `src/components/WithdrawalRow.jsx` with a live
  `Countdown.jsx`.

### 3.2 Rides — `src/pages/RidesPage.jsx`
- Reverse-chronological list of `RideRow`s.
- "Sync XOSS" button (server mode only) → `POST /api/sessions/sync`.

### 3.3 Wallet — `src/pages/WalletPage.jsx`
- All withdrawals, newest first, with status pills + countdowns. Tap to expand.

### 3.4 Settings — `src/pages/SettingsPage.jsx`
- Account info (mode, server, email, rate, payout phone).
- Re-show wallet override.
- Sign out.
- Owner widgets: `ManualSessionForm`, `CsvImporter`.
- Admin section: `DeveloperSection` (live constants).

### 3.5 Login — `src/pages/LoginPage.jsx`
- Server URL + email + password → `POST /api/auth/login`.
- Or "Use without a server" → standalone mode (`src/data/seed-sessions.js`).

---

## 4. Backend API (StitchMCP)

All defined in `server/http.mjs`. JWT-protected unless noted.

| Method | Path                          | File / function                                 |
| ------ | ----------------------------- | ----------------------------------------------- |
| GET    | `/api/health`                 | inline (no auth)                                |
| POST   | `/api/auth/login`             | `auth.mjs#checkOwnerLogin` + `signToken`        |
| GET    | `/api/balance`                | `reducer.mjs#totals` + `shouldHideWallet`       |
| GET    | `/api/sessions`               | `sessions-service.mjs#listAll`                  |
| POST   | `/api/sessions/import`        | `sessions-service.mjs#importSession` (+`csv.mjs`) |
| POST   | `/api/sessions/sync`          | `sessions-service.mjs#syncFromXoss`             |
| POST   | `/api/withdraw`               | `reducer.mjs#createWithdrawal` + `sms.mjs`      |
| GET    | `/api/withdrawals`            | `persistence.mjs#listWithdrawals` + sessions    |
| POST   | `/api/webhook/sms`            | `sms.mjs#isConfirmationBody` + `reducer.mjs#confirmWithdrawal` (no auth) |
| POST   | `/api/settings/show-wallet`   | `persistence.mjs#setState`                      |
| GET    | `/api/events`                 | `websocket.mjs#attach` (SSE, no auth)           |
| GET    | `/proof/:token`               | `proof-page.mjs#renderProofPage` (public)       |

---

## 5. Real-time updates (SSE)

`server/websocket.mjs#broadcast` emits these to every connected SPA:

| Event                  | Triggered by                         | Client effect (`src/state/actions.js`) |
| ---------------------- | ------------------------------------ | -------------------------------------- |
| `session:added`        | `sessions-service.mjs#importSession` | refresh()                              |
| `withdrawal:pending`   | `reducer.mjs#createWithdrawal`       | refresh()                              |
| `withdrawal:confirmed` | `reducer.mjs#confirmWithdrawal`      | toast + refresh() + hide wallet        |
| `withdrawal:expired`   | `reducer.mjs#expireOverdue` (60s tick) | toast + refresh()                    |

---

## 6. Withdrawal lifecycle (server-authoritative)

Pure-ish reducer in `server/reducer.mjs`. No HTTP, no DB literals.

```
[unwithdrawn km > 0]
        │  POST /api/withdraw
        ▼
   ┌──────────┐  SMS sent (Twilio or dry-run)
   │ pending  │ ────────────────────────────────────────┐
   │ (24h)    │                                          │
   └──────────┘                                          ▼
        │                                 webhook receives "$"
        │                                          │
   ┌────┴───────────┐               ┌──────────────┴──────────────┐
   ▼                ▼               ▼                              ▼
[expired]        [failed]       [confirmed]                    [no match]
 km return        Twilio         confirmed_ts set,             logged in
 (releaseSessions) send error    SSE broadcasts                sms_inbound
```

Background ticker every 60s: `server/server.mjs` → `expireOverdue()`.

---

## 7. Data flow — XOSS G+

Two paths, deduped by `external_id`:

1. **Cloud (preferred)** — `server/xoss.mjs#fetchRemoteSessions`. Real HTTP if
   `XOSS_API_*` is set, deterministic mock otherwise. Polled every 5 min from
   `server.mjs`.
2. **Manual / BLE** — `POST /api/sessions/import` accepts `{session}`,
   `{sessions:[]}`, or `{csv:"…"}`. Same dedupe path.

CSV format: `start_ts,end_ts,km[,external_id]` (timestamps ms-epoch or ISO).

---

## 8. SMS handling

**Outbound** — `server/sms.mjs`:
- Twilio set → real SMS.
- Not set → dry-run (logs body, returns `dry_run: true`, includes `sms_uri:`
  for the SPA to deep-link the phone composer).

**Inbound** — `server/http.mjs#POST /api/webhook/sms`:
- Body trimmed must be exactly `"$"` (`isConfirmationBody`).
- If Twilio configured, sender must match `PAYOUT_PHONE`.
- Confirms the oldest still-pending withdrawal via `confirmWithdrawal`.

**Standalone-mode equivalents**:
- `src/lib/sms-body.js#buildWithdrawSms` builds the same body.
- `startWithdrawal` opens `sms:+15194960491?body=…`.
- `src/state/actions.js#localConfirm` lets the user mark confirmed manually.
- `localExpireSweep` runs every 30s in the SPA when no server is connected.

---

## 9. Storage

**Server** — SQLite, schema in `server/persistence.mjs`:

```
sessions(id, source, external_id, start_ts, end_ts, km, withdrawal_id, created_ts)
withdrawals(id, km, cad, status, proof_token, created_ts, expires_ts,
            confirmed_ts, sms_sid, sms_dry_run)
sms_inbound(id, from_number, body, matched_withdrawal_id, received_ts)
app_state(key, value)
```

**Standalone** — `localStorage` key `bk:data` (sessions + withdrawals).

---

## 10. Security & secrets

- All API routes (except login, webhook, health, events, proof) require JWT.
- `JWT_SECRET`, `OWNER_*`, Twilio creds, DB path live in `.env` only.
- Proof tokens: 64 hex (UUID×2). Unguessable URLs.
- CLAUDE.md hook in `~/.claude/settings.json` blocks `git push`/`git commit`
  if any of the watch-list strings appear.

---

## 11. Test plan (manual)

1. `cp server/.env.example .env` → set passwords.
2. `npm install && npm run seed && npm run dev`.
3. Open http://localhost:5173 → log in.
4. Dashboard shows ~61.7 km → CAD ~ $6.18 (at $0.10/km).
5. Tap **Withdraw**. Confirm. Pending row + countdown appears. Server logs the
   dry-run SMS body.
6. In another shell:
   ```
   curl -X POST http://localhost:4000/api/webhook/sms \
     -d 'From=+15194960491' -d 'Body=$'
   ```
7. SPA flips to **confirmed** instantly via SSE; wallet card hides.
8. Re-show wallet via Settings → Re-show wallet.
9. Force expiry: open `bikepay.db` and `UPDATE withdrawals SET expires_ts=0`,
   wait one tick. Status flips to `expired`; km return to unwithdrawn.

---

## 12. Why this layout

- **Frontend / backend split.** `src/` and `server/` never import each other.
  Anything they share (rate, SMS body) is duplicated in tiny constants files
  and called out in code comments.
- **`lib/` vs `data/` vs components.** Pure functions belong in `lib/`. Static
  arrays / seeds belong in `data/`. React components import from both, never
  the reverse — so you can refactor a component without touching helpers.
- **`admin/` subtree.** `ManualSessionForm`, `CsvImporter`, `DeveloperSection`
  are owner-only. Putting them in `admin/` makes "what's privileged?" a
  one-glance question.
- **Thin entry files.** `App.jsx` is a route switch, `server.mjs` is a few
  imports + `listen()`. Both stay under 100 lines so reading the entry tells
  you the whole app shape.
