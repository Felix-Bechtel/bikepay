import "dotenv/config";

// Single source of truth for runtime config. No defaults that hide bad envs.
function env(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback === undefined) throw new Error(`Missing env: ${name}`);
    return fallback;
  }
  return v;
}

export const config = {
  port: parseInt(env("PORT", "4000"), 10),
  publicUrl: env("PUBLIC_URL", "http://localhost:4000"),
  databaseUrl: env("DATABASE_URL", "./bikepay.db"),
  jwtSecret: env("JWT_SECRET", "dev-secret-change-me"),
  ownerEmail: env("OWNER_EMAIL", "darrell.bechtel@gmail.com"),
  ownerPassword: env("OWNER_PASSWORD", "changeme"),

  // Pricing — current rate is $0.10 CAD per km. See src/constants.js for the
  // matching client-side constant.
  cadPerKm: parseFloat(env("CAD_PER_KM", "0.10")),

  payoutPhone: env("PAYOUT_PHONE", "+15194960491"),
  withdrawerName: env("WITHDRAWER_NAME", "Felix"),
  withdrawWindowMs: 24 * 60 * 60 * 1000,

  twilio: {
    sid: process.env.TWILIO_SID || "",
    token: process.env.TWILIO_AUTH_TOKEN || "",
    from: process.env.TWILIO_NUMBER || "",
  },
  xoss: {
    base: process.env.XOSS_API_BASE || "",
    key: process.env.XOSS_API_KEY || "",
  },
};

export const twilioEnabled = () =>
  !!(config.twilio.sid && config.twilio.token && config.twilio.from);
