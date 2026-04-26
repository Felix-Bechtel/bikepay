import { randomUUID } from "node:crypto";
import * as p from "./persistence.mjs";
import { fetchRemoteSessions } from "./xoss.mjs";
import { broadcast } from "./websocket.mjs";

// Insert with dedupe by external_id. Returns the session, or null if skipped.
export function importSession(input) {
  if (input.km <= 0 || input.end_ts < input.start_ts) {
    throw new Error("invalid session");
  }
  if (input.external_id) {
    if (p.findSessionByExternal(input.external_id)) return null;
  }
  const s = {
    id: randomUUID(),
    source: input.source ?? "manual",
    external_id: input.external_id ?? null,
    start_ts: input.start_ts,
    end_ts: input.end_ts,
    km: input.km,
  };
  p.insertSession(s);
  broadcast("session:added", { session: s });
  return s;
}

export function listAll() {
  return p.listSessions();
}

export async function syncFromXoss() {
  const since = parseInt(p.getState("xoss:lastSync") || "0", 10);
  const remote = await fetchRemoteSessions(since);
  let added = 0;
  let maxTs = since;
  for (const r of remote) {
    if (importSession({ source: "xoss", ...r })) added++;
    if (r.end_ts > maxTs) maxTs = r.end_ts;
  }
  p.setState("xoss:lastSync", String(maxTs));
  return added;
}
