// Builds the SMS body sent on a withdrawal. Per-account `name` is included
// so the recipient knows who they're being asked to pay.
export function buildWithdrawSms({ name, amountCad, km, proofUrl }) {
  const amount = amountCad.toFixed(2);
  const kmStr = km.toFixed(1);
  return `${name} has withdrawn $${amount} (${kmStr} km). Send $${amount} to their bank. Proof: ${proofUrl}. Reply with a single '$' within 24 hours to confirm.`;
}
