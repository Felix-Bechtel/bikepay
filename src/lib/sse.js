// Subscribe to /api/events; call onEvent(name, data) for each. Returns close fn.
export function subscribeEvents(serverBase, onEvent, onConnState) {
  const base = (serverBase || "").replace(/\/$/, "");
  const es = new EventSource(base + "/api/events");
  const NAMES = [
    "session:added",
    "withdrawal:pending",
    "withdrawal:confirmed",
    "withdrawal:expired",
  ];
  for (const name of NAMES) {
    es.addEventListener(name, (e) => {
      try {
        onEvent(name, JSON.parse(e.data));
      } catch {
        onEvent(name, null);
      }
    });
  }
  es.onopen = () => onConnState?.(true);
  es.onerror = () => onConnState?.(false);
  return () => es.close();
}
