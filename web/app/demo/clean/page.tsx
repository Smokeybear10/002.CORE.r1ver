"use client"

import { parseObservation, suitSymbol } from "@/app/lib/cards"

const HANDS = ["AsKd~7h8c2s", "AhKs~7h8c2s", "AcKh~7d8s2c", "AdKc~7s8h2d"]
const DECISIONS = [
  { edge: "*", label: "Call", mass: 0.35 },
  { edge: "3/5", label: "Raise 3/5", mass: 0.28 },
  { edge: "!", label: "Shove", mass: 0.17 },
  { edge: "F", label: "Fold", mass: 0.12 },
  { edge: "O", label: "Check", mass: 0.08 },
]
const HISTOGRAM = Array.from({ length: 30 }, (_, i) => ({
  equity: i / 29,
  density: Math.random() * 0.05 + (i > 10 && i < 20 ? 0.04 : 0.01),
}))

function Card({ rank, suit }: { rank: string; suit: string }) {
  const red = suit === "h" || suit === "d"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 40, height: 56, background: "#fff", color: red ? "#dc2626" : "#0f172a",
      fontFamily: "system-ui", fontSize: 14, fontWeight: 700, borderRadius: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      border: "1px solid #e2e8f0",
    }}>
      {rank}<span style={{ fontSize: 11, marginLeft: 1 }}>{suitSymbol(suit)}</span>
    </span>
  )
}

function Cards({ obs }: { obs: string }) {
  const { pocket, board } = parseObservation(obs)
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {pocket.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
      {board.length > 0 && <span style={{ color: "#cbd5e1", margin: "0 6px", fontSize: 18 }}>|</span>}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

export default function CleanPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#f8fafc", color: "#0f172a", fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      minHeight: "100vh",
    }}>
      {/* Nav */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: "#2563eb" }}>R1</span>
          <span style={{ color: "#0f172a" }}>VER</span>
        </span>
        <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Clean Slate Variant</span>
      </header>

      <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: -0.5 }}>Hand Analysis</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>Flop stage analysis for As Kd | 7h 8c 2s</p>

        {/* Main panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <Cards obs="AsKd~7h8c2s" />

          {/* Equity bar */}
          <div style={{ margin: "24px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 10, background: "#f1f5f9", borderRadius: 99 }}>
              <div style={{ width: "72%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #2563eb, #3b82f6)" }} />
            </div>
            <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>72%</span>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { label: "Cluster", value: "F::3a", sub: "Flop" },
              { label: "Equity", value: "72.0%", sub: "" },
              { label: "Density", value: "1.34%", sub: "of observation space" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: "#0f172a" }}>{s.value}</div>
                {s.sub && <div style={{ color: "#94a3b8", fontSize: 12 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Histogram */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Distribution over next street</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
            {HISTOGRAM.map((d, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 4,
                height: `${Math.max((d.density / maxDensity) * 100, 3)}%`,
                background: d.equity < 0.33 ? "#fca5a5" : d.equity < 0.66 ? "#93c5fd" : "#6ee7b7",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
            <span>0% equity</span><span>100% equity</span>
          </div>
        </div>

        {/* Action chart */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 28, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Optimal Strategy</div>
          {DECISIONS.map(d => {
            const w = (d.mass / maxMass) * 100
            const colors: Record<string, string> = { F: "#ef4444", O: "#94a3b8", "*": "#2563eb", "!": "#f59e0b", "3/5": "#22c55e" }
            return (
              <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ width: 80, textAlign: "right", color: "#64748b", fontSize: 14, fontWeight: 500 }}>{d.label}</span>
                <div style={{ flex: 1, height: 28, background: "#f1f5f9", borderRadius: 6 }}>
                  <div style={{
                    width: `${Math.max(w, 1)}%`, height: "100%", borderRadius: 6,
                    background: colors[d.edge] ?? "#22c55e",
                    display: "flex", alignItems: "center", paddingLeft: 8,
                  }}>
                    {w > 20 && <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "monospace" }}>{(d.mass * 100).toFixed(1)}%</span>}
                  </div>
                </div>
                {w <= 20 && <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", width: 40 }}>{(d.mass * 100).toFixed(1)}%</span>}
              </div>
            )
          })}
        </div>

        {/* Neighbors */}
        <div>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Nearest Clusters</div>
          {HANDS.slice(1).map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 8,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}>
              <Cards obs={h} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 24, fontSize: 13, fontFamily: "monospace" }}>
                <span style={{ color: "#94a3b8" }}>F::3{String.fromCharCode(97 + i)}</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{(71 - i).toFixed(1)}%</span>
                <span style={{ color: "#94a3b8" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
