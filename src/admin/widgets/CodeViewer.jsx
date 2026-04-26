// Read-only viewer for short code snippets. Used by DeveloperSection.
export function CodeViewer({ title, code }) {
  return (
    <div
      style={{
        background: "var(--surface-low)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: ".7rem .9rem",
        marginTop: ".5rem",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: ".7rem",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--dim)",
            marginBottom: ".25rem",
            fontWeight: 700,
          }}
        >
          {title}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          fontSize: ".78rem",
          color: "var(--text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
