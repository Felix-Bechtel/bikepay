# BikePay

Track km from a XOSS G+ cycling computer, earn **CAD $0.10 per km**, withdraw
via SMS-confirmed payouts.

Two pieces, in one repo, organised so a stranger can find any feature by
following the directory names:

```
src/                 React + Vite SPA (the BikePay UI)
  constants.js       Pricing + payout phone (CAD_PER_KM = 0.10)
  data/              Static / seed data (no logic)
  lib/               Pure helpers (compute, format, csv, sms-body, api, sse)
  state/             Store + actions
  components/        Reusable UI primitives
  pages/             One file per top-level screen
  admin/             Owner-only subtree (sections + widgets)
  styles/theme.css   Velos design tokens
  App.jsx            Thin route switch
  main.jsx           Entry

server/              Node backend (StitchMCP)
  config.mjs         Env + constants (CAD_PER_KM source-of-truth)
  persistence.mjs    SQLite, all SQL lives here
  reducer.mjs        Withdrawal lifecycle (create/confirm/expire) — pure-ish
  sessions-service.mjs   Import + dedupe + XOSS sync
  csv.mjs            CSV → session rows
  auth.mjs           JWT + login check
  sms.mjs            Twilio adapter + dry-run + sender check
  xoss.mjs           XOSS G+ cloud adapter (real or mock)
  http.mjs           All Express routes
  websocket.mjs      Server-Sent Events broker
  static.mjs         Serves built /dist
  proof-page.mjs     Public proof renderer
  seed.mjs           5-ride demo seed
  server.mjs         Thin entry
```

## Quick start

```bash
cp server/.env.example .env       # edit OWNER_PASSWORD + JWT_SECRET
npm install
npm run seed                      # 5 demo rides
npm run dev                       # web on :5173, server on :4000 (proxied)
```

In production: `npm run build && npm start` — the server then serves the SPA
out of `/dist` on port 4000.

## Pricing

The single source of truth is `CAD_PER_KM`:

- **Server**: `server/config.mjs` (overridable via `CAD_PER_KM` env)
- **Client**: `src/constants.js`

Both are currently **0.10** (1 km = 10 ¢). Change in both places (or set the
env on the server, which then wins for server-mode users).

## Configuring SMS

Set Twilio creds in `.env`:

```
TWILIO_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_NUMBER=+1xxxxxxxxxx
PUBLIC_URL=https://your-public-host
```

Point Twilio's inbound webhook at `POST {PUBLIC_URL}/api/webhook/sms`.

If Twilio is left blank, the server runs in **dry-run** mode (logs the SMS
body) and the SPA opens the phone's native composer pre-filled instead.

## Configuring XOSS sync

```
XOSS_API_BASE=https://api.xossgps.com
XOSS_API_KEY=...
```

If unset, `server/xoss.mjs` uses a deterministic mock so the rest of the
pipeline runs end-to-end.

## Architectural rules in this repo

- Frontend and backend are isolated subtrees. They communicate only over JSON
  (HTTP + SSE). Zero cross-imports.
- Pure data lives in `src/data/`. Pure helpers live in `src/lib/`. Components
  import from those, never the other way.
- Owner-only functionality lives in `src/admin/` (`sections/` + `widgets/`),
  never intermixed with public pages.
- One responsibility per file. Server concerns are one `.mjs` each. Pages are
  one `.jsx` each.
- Entry files (`App.jsx`, `server.mjs`) are thin glue — under ~100 lines.
- Named exports everywhere. No default exports.
- Design tokens live in `src/styles/theme.css`. Never inlined.

## Design notes

**XOSS sync — cloud-first, BLE fallback.** XOSS doesn't publish a stable BLE
profile and most users already sync via the official XOSS app. Cloud-poll
lives entirely server-side; BLE remains as a manual import path (CSV / single
session POST) for offline devices.

**Twilio for SMS.** iOS cannot read incoming SMS programmatically; on Android
the `RECEIVE_SMS` permission is a Play-Store red flag. Twilio's webhook is the
only path that works identically on both platforms.

**Server-authoritative withdrawals.** The 24h timer, the strict `$`-equality
check, the session-locking, and expiry sweeps all live in `server/reducer.mjs`.
The UI just reflects state. That means "did the recipient confirm in time?"
cannot be spoofed from the phone.
