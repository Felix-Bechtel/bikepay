// Reusable glass-morphism card matching the Velos design system.
export function GlassCard({ children, className = "", as: As = "section" }) {
  return (
    <As className={`glass-card inner-glow ${className}`} style={cardStyle}>
      {children}
    </As>
  );
}

const cardStyle = { borderRadius: 24, padding: "1.1rem" };
