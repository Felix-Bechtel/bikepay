// Server-Sent Events broadcaster. Kept tiny on purpose — anything fancier
// (rooms, auth-per-channel) belongs in a real WS layer, not here.
const clients = new Set();

export function attach(res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
  res.write(`event: hello\ndata: {}\n\n`);
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function broadcast(event, payload) {
  const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try {
      c.write(line);
    } catch {
      /* dropped */
    }
  }
}
