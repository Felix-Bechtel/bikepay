// Bottom-sheet modal. Open via prop; backdrop click closes.
export function Modal({ open, onClose, children }) {
  return (
    <div
      className={`modal ${open ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="sheet">{children}</div>
    </div>
  );
}
