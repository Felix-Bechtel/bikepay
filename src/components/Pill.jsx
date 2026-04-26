// Status pill. Class names map to .pill.pending/.confirmed/.expired/.failed.
export function Pill({ status }) {
  return <span className={`pill ${status}`}>{status}</span>;
}
