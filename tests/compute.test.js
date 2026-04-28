// Unit tests for the pure balance reducer + helpers. Deterministic, no IO,
// no network, no API keys.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBalance, shouldHideWallet } from "../src/lib/compute.js";
import { parseCsv, parseTs } from "../src/lib/csv.js";
import { buildWithdrawSms } from "../src/lib/sms-body.js";
import { CAD_PER_KM } from "../src/constants.js";

test("rate is $0.10 / km", () => {
  assert.equal(CAD_PER_KM, 0.10);
});

test("computeBalance with no data returns zero", () => {
  const t = computeBalance({ sessions: [], withdrawals: [] });
  assert.equal(t.total_km, 0);
  assert.equal(t.unwithdrawn_km, 0);
  assert.equal(t.cad_balance, 0);
});

test("computeBalance sums sessions and excludes pending+confirmed km", () => {
  const sessions = [
    { id: "a", km: 10, withdrawal_id: null },
    { id: "b", km: 4, withdrawal_id: "w1" },  // pending
    { id: "c", km: 6, withdrawal_id: "w2" },  // confirmed
  ];
  const withdrawals = [
    { id: "w1", status: "pending" },
    { id: "w2", status: "confirmed" },
  ];
  const t = computeBalance({ sessions, withdrawals });
  assert.equal(t.total_km, 20);
  assert.equal(t.pending_km, 4);
  assert.equal(t.confirmed_km, 6);
  assert.equal(t.unwithdrawn_km, 10);
  assert.equal(t.cad_balance, 1.00); // 10 km × $0.10
});

test("expired withdrawals release their km back to unwithdrawn", () => {
  const sessions = [
    { id: "a", km: 12.5, withdrawal_id: "w1" }, // was expired-then-released
    { id: "b", km: 7.5, withdrawal_id: null },
  ];
  // The reducer in actions.js clears withdrawal_id on expiry; this test
  // simulates that post-state to confirm computeBalance treats it as free.
  const t = computeBalance({
    sessions: sessions.map((s) =>
      s.id === "a" ? { ...s, withdrawal_id: null } : s
    ),
    withdrawals: [{ id: "w1", status: "expired" }],
  });
  assert.equal(t.unwithdrawn_km, 20);
});

test("shouldHideWallet reads the per-account flag", () => {
  assert.equal(shouldHideWallet({ hideWallet: true }), true);
  assert.equal(shouldHideWallet({ hideWallet: false }), false);
  assert.equal(shouldHideWallet({}), false);
});

test("parseCsv accepts ISO and ms-epoch timestamps and dedup-friendly fields", () => {
  const rows = parseCsv(
    [
      "start_ts,end_ts,km,external_id",
      "2026-04-26T18:00:00Z,2026-04-26T18:35:00Z,12.4,xoss-abc",
      "1714158000000,1714159800000,7.1,xoss-def",
      "bad,bad,bad,bad",
    ].join("\n")
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].external_id, "xoss-abc");
  assert.equal(rows[0].km, 12.4);
  assert.equal(rows[1].start_ts, 1714158000000);
});

test("parseTs handles ms-epoch ints and ISO strings", () => {
  assert.equal(parseTs("1714158000000"), 1714158000000);
  assert.equal(parseTs("2026-04-26T18:00:00Z"), Date.parse("2026-04-26T18:00:00Z"));
  assert.ok(!isFinite(parseTs("garbage")));
});

test("buildWithdrawSms matches the spec format verbatim", () => {
  const body = buildWithdrawSms({
    name: "Felix",
    amountCad: 12.35,
    km: 25.7,
    proofUrl: "https://example.test/p/x",
  });
  assert.equal(
    body,
    "Felix has withdrawn $12.35 (25.7 km). Send $12.35 to their bank. Proof: https://example.test/p/x. Reply with a single '$' within 24 hours to confirm."
  );
});
