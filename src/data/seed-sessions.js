// Static seed used only in standalone mode on first run, so a freshly opened
// PWA shows something instead of an empty dashboard.
const day = 24 * 60 * 60 * 1000;

export function buildSeedSessions(now = Date.now()) {
  return [
    { offset: 5 * day, mins: 38, km: 14.2 },
    { offset: 3 * day, mins: 51, km: 19.4 },
    { offset: 1 * day, mins: 32, km: 11.7 },
  ].map((r, i) => ({
    id: `seed-${i}`,
    source: "seed",
    external_id: null,
    start_ts: now - r.offset,
    end_ts: now - r.offset + r.mins * 60_000,
    km: r.km,
    withdrawal_id: null,
  }));
}
