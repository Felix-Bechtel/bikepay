import { config, twilioEnabled } from "./config.mjs";

// SMS body matches the spec verbatim. The exact format is part of the public
// contract: keep it in sync with src/lib/sms-body.js (client-side dry-run).
export function buildWithdrawSms({ amountCad, km, proofUrl }) {
  const amount = amountCad.toFixed(2);
  const kmStr = km.toFixed(1);
  return `${config.withdrawerName} has withdrawn $${amount} (${kmStr} km). Send $${amount} to his bank. Proof: ${proofUrl}. Reply with a single '$' within 24 hours to confirm.`;
}

export async function sendSms(to, body) {
  if (!twilioEnabled()) {
    console.log("[sms:dry-run] →", to, body);
    return { sid: null, dryRun: true };
  }
  const twilio = (await import("twilio")).default;
  const client = twilio(config.twilio.sid, config.twilio.token);
  const msg = await client.messages.create({
    from: config.twilio.from,
    to,
    body,
  });
  return { sid: msg.sid, dryRun: false };
}

// Inbound rule: confirmation iff body trimmed === "$".
export function isConfirmationBody(body) {
  return String(body ?? "").trim() === "$";
}

// Optional sender check — only enforced when Twilio is configured (real prod path).
export function isAllowedSender(from) {
  if (!config.twilio.sid) return true;
  const norm = (s) => String(s || "").replace(/[^\d]/g, "");
  return norm(from) === norm(config.payoutPhone);
}
