import Database from "better-sqlite3";
import { config } from "./config.mjs";

// All SQL lives here. Other modules call named functions, never `db.prepare(...)`.

const db = new Database(config.databaseUrl);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER NOT NULL,
  km REAL NOT NULL,
  withdrawal_id TEXT,
  created_ts INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)
);
CREATE INDEX IF NOT EXISTS idx_sessions_external ON sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_sessions_withdrawal ON sessions(withdrawal_id);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  km REAL NOT NULL,
  cad REAL NOT NULL,
  status TEXT NOT NULL,
  proof_token TEXT NOT NULL UNIQUE,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER NOT NULL,
  confirmed_ts INTEGER,
  sms_sid TEXT,
  sms_dry_run INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

CREATE TABLE IF NOT EXISTS sms_inbound (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  matched_withdrawal_id TEXT,
  received_ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// ---------- sessions ----------

export function insertSession(s) {
  db.prepare(
    `INSERT INTO sessions (id, source, external_id, start_ts, end_ts, km)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(s.id, s.source, s.external_id ?? null, s.start_ts, s.end_ts, s.km);
}

export function findSessionByExternal(externalId) {
  return db
    .prepare(`SELECT * FROM sessions WHERE external_id=?`)
    .get(externalId);
}

export function listSessions() {
  return db
    .prepare(
      `SELECT s.*, w.status AS withdrawal_status FROM sessions s
       LEFT JOIN withdrawals w ON w.id = s.withdrawal_id
       ORDER BY s.start_ts DESC`
    )
    .all();
}

export function unwithdrawnSessions() {
  return db
    .prepare(
      `SELECT s.* FROM sessions s
       LEFT JOIN withdrawals w ON w.id = s.withdrawal_id
       WHERE s.withdrawal_id IS NULL OR w.status IN ('expired','failed')`
    )
    .all();
}

export function lockSessionsToWithdrawal(sessionIds, withdrawalId) {
  const upd = db.prepare(`UPDATE sessions SET withdrawal_id=? WHERE id=?`);
  for (const id of sessionIds) upd.run(withdrawalId, id);
}

export function releaseSessionsFromWithdrawal(withdrawalId) {
  db.prepare(`UPDATE sessions SET withdrawal_id=NULL WHERE withdrawal_id=?`).run(
    withdrawalId
  );
}

// ---------- withdrawals ----------

export function insertWithdrawal(w) {
  db.prepare(
    `INSERT INTO withdrawals
     (id, km, cad, status, proof_token, created_ts, expires_ts)
     VALUES (?, ?, ?, 'pending', ?, ?, ?)`
  ).run(w.id, w.km, w.cad, w.proof_token, w.created_ts, w.expires_ts);
}

export function setWithdrawalStatus(id, status, ts = null) {
  if (status === "confirmed") {
    db.prepare(
      `UPDATE withdrawals SET status='confirmed', confirmed_ts=? WHERE id=?`
    ).run(ts, id);
  } else {
    db.prepare(`UPDATE withdrawals SET status=? WHERE id=?`).run(status, id);
  }
}

export function setWithdrawalSms(id, sid, dryRun) {
  db.prepare(
    `UPDATE withdrawals SET sms_sid=?, sms_dry_run=? WHERE id=?`
  ).run(sid, dryRun ? 1 : 0, id);
}

export function getWithdrawal(id) {
  return db.prepare(`SELECT * FROM withdrawals WHERE id=?`).get(id);
}

export function getWithdrawalByToken(token) {
  return db
    .prepare(`SELECT * FROM withdrawals WHERE proof_token=?`)
    .get(token);
}

export function listWithdrawals() {
  return db
    .prepare(`SELECT * FROM withdrawals ORDER BY created_ts DESC`)
    .all();
}

export function withdrawalSessions(id) {
  return db
    .prepare(
      `SELECT * FROM sessions WHERE withdrawal_id=? ORDER BY start_ts ASC`
    )
    .all(id);
}

export function pendingOverdue(now) {
  return db
    .prepare(
      `SELECT id FROM withdrawals WHERE status='pending' AND expires_ts <= ?`
    )
    .all(now);
}

export function oldestPendingActive(now) {
  return db
    .prepare(
      `SELECT * FROM withdrawals
       WHERE status='pending' AND expires_ts > ?
       ORDER BY created_ts ASC LIMIT 1`
    )
    .get(now);
}

export function countConfirmed() {
  return (
    db
      .prepare(`SELECT COUNT(*) AS n FROM withdrawals WHERE status='confirmed'`)
      .get().n
  );
}

// ---------- sms ----------

export function insertInboundSms(from, body, ts) {
  const r = db
    .prepare(
      `INSERT INTO sms_inbound (from_number, body, received_ts) VALUES (?,?,?)`
    )
    .run(from, body, ts);
  return r.lastInsertRowid;
}

export function attachInboundMatch(inboundId, withdrawalId) {
  db.prepare(
    `UPDATE sms_inbound SET matched_withdrawal_id=? WHERE id=?`
  ).run(withdrawalId, inboundId);
}

// ---------- aggregates ----------

export function totalsRow() {
  const total = db
    .prepare(`SELECT COALESCE(SUM(km),0) AS km FROM sessions`)
    .get().km;
  const confirmed = db
    .prepare(
      `SELECT COALESCE(SUM(s.km),0) AS km FROM sessions s
       JOIN withdrawals w ON w.id = s.withdrawal_id
       WHERE w.status = 'confirmed'`
    )
    .get().km;
  const pending = db
    .prepare(
      `SELECT COALESCE(SUM(s.km),0) AS km FROM sessions s
       JOIN withdrawals w ON w.id = s.withdrawal_id
       WHERE w.status = 'pending'`
    )
    .get().km;
  return { total, confirmed, pending };
}

// ---------- app state ----------

export function getState(key) {
  const r = db.prepare(`SELECT value FROM app_state WHERE key=?`).get(key);
  return r?.value ?? null;
}

export function setState(key, value) {
  db.prepare(
    `INSERT INTO app_state(key,value) VALUES(?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(key, value);
}

// ---------- transactions ----------

export function transaction(fn) {
  return db.transaction(fn);
}
