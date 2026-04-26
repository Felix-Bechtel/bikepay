// Serve the built SPA out of /dist if it exists, otherwise fall back to /src
// so dev iteration works without a build step (Vite handles that during dev).
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function attachStatic(app) {
  const builtDir = resolve(__dirname, "../dist");
  if (existsSync(builtDir)) {
    app.use(express.static(builtDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/proof"))
        return next();
      res.sendFile(resolve(builtDir, "index.html"));
    });
  }
}
