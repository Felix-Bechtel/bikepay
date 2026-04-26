import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During dev, the SPA runs on Vite (5173) and proxies API + proof requests
// through to the StitchMCP server (4000). In production, `npm run build`
// emits to /dist which the Express static layer serves directly.
// Sub-path on GitHub Pages: https://<user>.github.io/bikepay/
// Local dev still uses '/' (env var is unset).
const isProd = process.env.NODE_ENV === "production";
const base = process.env.VITE_BASE || (isProd ? "/bikepay/" : "/");

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/proof": "http://localhost:4000",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
