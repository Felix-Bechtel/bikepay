// Thin entry: wire up Express, attach the router, mount SSE, kick off
// background tickers, listen. Real work lives in the modules this imports.
import express from "express";
import cors from "cors";
import { config } from "./config.mjs";
import { buildRouter } from "./http.mjs";
import { attach } from "./websocket.mjs";
import { attachStatic } from "./static.mjs";
import { expireOverdue } from "./reducer.mjs";
import { syncFromXoss } from "./sessions-service.mjs";

const app = express();
app.set("trust proxy", true); // populate req.ip from X-Forwarded-For
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(buildRouter());
app.get("/api/events", (_req, res) => attach(res));
attachStatic(app);

setInterval(() => {
  try {
    expireOverdue();
  } catch (e) {
    console.error("expire tick", e);
  }
}, 60_000);

setInterval(() => {
  syncFromXoss().catch((e) => console.error("xoss sync", e.message));
}, 5 * 60_000);

app.listen(config.port, () =>
  console.log(`BikePay server on ${config.publicUrl}`)
);
