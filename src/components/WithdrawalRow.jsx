import { useState } from "react";
import { fmtCad, fmtKm, isoShort } from "../lib/format.js";
import { Pill } from "./Pill.jsx";
import { Countdown } from "./Countdown.jsx";
import { localConfirm } from "../state/actions.js";
import { WITHDRAWAL_STATUS } from "../constants.js";

export function WithdrawalRow({ withdrawal: w }) {
  const [open, setOpen] = useState(false);
  const isPending = w.status === WITHDRAWAL_STATUS.pending;
  return (
    <div
      className="glass-card"
      style={{ padding: "1rem", borderRadius: 18, cursor: "pointer" }}
      onClick={() => setOpen((x) => !x)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            {fmtCad(w.cad)} · {fmtKm(w.km)} km
          </div>
          <div style={{ color: "var(--dim)", fontSize: ".8rem" }}>
            {isoShort(w.created_ts)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Pill status={w.status} />
          {isPending && (
            <div style={{ marginTop: 4 }}>
              <Countdown expiresTs={w.expires_ts} />
            </div>
          )}
        </div>
      </div>
      {open && (
        <div style={{ marginTop: ".7rem", color: "var(--dim)", fontSize: ".8rem" }}>
          <div>Expires: {isoShort(w.expires_ts)}</div>
          {w.confirmed_ts && <div>Confirmed: {isoShort(w.confirmed_ts)}</div>}
          {isPending && (
            <button
              className="btn small"
              style={{ marginTop: ".6rem" }}
              onClick={(e) => {
                e.stopPropagation();
                localConfirm(w.id);
              }}
            >
              Mark confirmed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
