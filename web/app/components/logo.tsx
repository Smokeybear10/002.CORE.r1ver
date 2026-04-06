export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size * 0.72, height: size,
      borderRadius: Math.max(size * 0.1, 2),
      background: "linear-gradient(145deg, #0f0f0f 0%, #080808 100%)",
      border: "1px solid rgba(201,168,76,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: size * 0.48, fontWeight: 700,
      color: "#c9a84c",
      letterSpacing: 0,
      boxShadow: `0 ${size * 0.08}px ${size * 0.28}px rgba(0,0,0,0.5), 0 0 1px rgba(201,168,76,0.2)`,
      flexShrink: 0,
    }}>
      1
    </div>
  )
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: size * 0.4,
    }}>
      <Logo size={size * 1.4} />
      <span style={{
        fontSize: size, fontWeight: 400, letterSpacing: size * 0.12,
        color: "#c9a84c",
      }}>
        R<span style={{ fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700 }}>1</span>VER
      </span>
    </div>
  )
}
