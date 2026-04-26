// Per-IP login rate limiter.
//
// Rule: 5 failed attempts from one IP → 24h ban. Any successful login from
// that IP clears the counter immediately. Bans auto-expire.
//
// State is persisted via app_state in persistence.mjs so the ban survives a
// server restart (otherwise an attacker could just trigger a restart).

import * as p from "./persistence.mjs";

const MAX_FAILS = 5;
const BAN_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = "ratelimit:login:";

export function checkBan(ip, now = Date.now()) {
  const rec = readRecord(ip);
  if (!rec) return { banned: false, retryMs: 0, fails: 0 };
  if (rec.banned_until && rec.banned_until > now) {
    return { banned: true, retryMs: rec.banned_until - now, fails: rec.fails };
  }
  if (rec.banned_until && rec.banned_until <= now) {
    // Stale ban — clear it.
    clear(ip);
    return { banned: false, retryMs: 0, fails: 0 };
  }
  return { banned: false, retryMs: 0, fails: rec.fails };
}

export function recordFail(ip, now = Date.now()) {
  const rec = readRecord(ip) || { fails: 0, banned_until: 0 };
  rec.fails += 1;
  rec.last_ts = now;
  if (rec.fails >= MAX_FAILS) rec.banned_until = now + BAN_MS;
  writeRecord(ip, rec);
  return rec;
}

export function recordSuccess(ip) {
  clear(ip);
}

function key(ip) {
  return KEY_PREFIX + ip;
}

function readRecord(ip) {
  const raw = p.getState(key(ip));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRecord(ip, rec) {
  p.setState(key(ip), JSON.stringify(rec));
}

function clear(ip) {
  p.setState(key(ip), "");
}

export function describeWait(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}
