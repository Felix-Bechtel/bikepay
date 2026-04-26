// One-shot seeder. Idempotent: bails out if any sessions already exist.
import * as p from "./persistence.mjs";
import { importSession } from "./sessions-service.mjs";

const existing = p.listSessions().length;
if (existing > 0) {
  console.log(`Already ${existing} sessions — leaving DB alone.`);
  process.exit(0);
}

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const seed = [
  { offset: 5 * day, mins: 38, km: 14.2 },
  { offset: 4 * day, mins: 25, km: 9.6 },
  { offset: 3 * day, mins: 51, km: 19.4 },
  { offset: 1 * day, mins: 32, km: 11.7 },
  { offset: 0.25 * day, mins: 18, km: 6.8 },
];

for (const r of seed) {
  const start = now - r.offset;
  importSession({
    source: "xoss",
    external_id: `seed-${start}`,
    start_ts: start,
    end_ts: start + r.mins * 60_000,
    km: r.km,
  });
}

const total = seed.reduce((a, r) => a + r.km, 0);
console.log(`Seeded ${seed.length} rides, ${total.toFixed(2)} km total.`);
