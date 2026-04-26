/**
 * XOSS G+ cloud adapter.
 *
 * Cloud-first when XOSS_API_BASE + XOSS_API_KEY are set, deterministic mock
 * otherwise. The mock generates one fresh ride if at least 60s passed since
 * the last sync — useful for demoing the full pipeline without real creds.
 */
import { config } from "./config.mjs";

export async function fetchRemoteSessions(sinceTs) {
  if (!config.xoss.base || !config.xoss.key) return mockSessions(sinceTs);
  const res = await fetch(
    `${config.xoss.base}/sessions?since=${Math.floor(sinceTs / 1000)}`,
    { headers: { Authorization: `Bearer ${config.xoss.key}` } }
  );
  if (!res.ok) throw new Error(`XOSS upstream ${res.status}`);
  const data = await res.json();
  return data.map((s) => ({
    external_id: s.id,
    start_ts: Date.parse(s.started_at),
    end_ts: Date.parse(s.ended_at),
    km: s.distance_km,
  }));
}

function mockSessions(sinceTs) {
  const now = Date.now();
  if (now - sinceTs < 60_000) return [];
  const start = sinceTs + 60_000;
  const durationMin = 20 + Math.floor(Math.random() * 20);
  const end = start + durationMin * 60_000;
  const km = +(durationMin * 0.4).toFixed(2);
  return [{ external_id: `mock-${start}`, start_ts: start, end_ts: end, km }];
}
