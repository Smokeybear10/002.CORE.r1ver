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
      width: 42, height: 58, background: "#fff", color: red ? "#dc2626" : "#1e293b",
      fontFamily: "'Georgia', serif", fontSize: 15, fontWeight: 700, borderRadius: 6,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      {rank}<span style={{ fontSize: 12, marginLeft: 1 }}>{suitSymbol(suit)}</span>
    </span>
  )
}

function Cards({ obs }: { obs: string }) {
  const { pocket, board } = parseObservation(obs)
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
      {pocket.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
      {board.length > 0 && <span style={{ color: "#2d3548", margin: "0 8px", fontSize: 18 }}>|</span>}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

export default function PokerProPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#141922", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: "100vh", display: "flex",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: "#0f1219", borderRight: "1px solid #1e2636",
        padding: "20px 0", flexShrink: 0,
      }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>
            <span style={{ color: "#10b981" }}>R1</span>
            <span style={{ color: "#e2e8f0" }}>VER</span>
          </span>
          <div style={{ color: "#4a5568", fontSize: 11, marginTop: 2 }}>Poker AI Solver</div>
        </div>
        {[
          { label: "Explorer", active: true },
          { label: "Strategy", active: false },
          { label: "Ranges", active: false },
          { label: "Training", active: false },
        ].map(item => (
          <div key={item.label} style={{
            padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer",
            color: item.active ? "#10b981" : "#4a5568",
            background: item.active ? "rgba(16,185,129,0.08)" : "transparent",
            borderLeft: item.active ? "2px solid #10b981" : "2px solid transparent",
          }}>
            {item.label}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, padding: "24px 32px", maxWidth: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2, letterSpacing: -0.3 }}>Hand Analysis</h1>
            <span style={{ color: "#4a5568", fontSize: 13 }}>Flop // As Kd | 7h 8c 2s</span>
          </div>
          <div style={{
            background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 12, fontWeight: 600,
            padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)",
          }}>
            GTO Optimal
          </div>
        </div>

        {/* Cards + equity panel */}
        <div style={{ background: "#1a2030", borderRadius: 12, border: "1px solid #1e2636", padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Cards obs="AsKd~7h8c2s" />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>72.0%</div>
              <div style={{ color: "#4a5568", fontSize: 12 }}>Hand Equity</div>
            </div>
          </div>

          {/* Equity bar */}
          <div style={{ height: 6, background: "#141922", borderRadius: 99, marginBottom: 20 }}>
            <div style={{
              width: "72%", height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #059669, #10b981, #34d399)",
            }} />
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "Cluster", value: "F::3a" },
              { label: "Street", value: "Flop" },
              { label: "Density", value: "1.34%" },
              { label: "Distance", value: "0.0000" },
            ].map(s => (
              <div key={s.label} style={{ background: "#141922", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "#e2e8f0" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Two columns: Histogram + Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Histogram */}
          <div style={{ background: "#1a2030", borderRadius: 12, border: "1px solid #1e2636", padding: 20 }}>
            <div style={{ color: "#4a5568", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Equity Distribution</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 100 }}>
              {HISTOGRAM.map((d, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  height: `${Math.max((d.density / maxDensity) * 100, 3)}%`,
                  background: d.equity < 0.33 ? "#ef4444" : d.equity < 0.66 ? "#10b981" : "#34d399",
                  opacity: 0.8,
                }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#2d3548", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: "#1a2030", borderRadius: 12, border: "1px solid #1e2636", padding: 20 }}>
            <div style={{ color: "#4a5568", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Strategy Mix</div>
            {DECISIONS.map(d => {
              const w = (d.mass / maxMass) * 100
              const colors: Record<string, string> = { F: "#ef4444", O: "#6b7280", "*": "#10b981", "!": "#f59e0b", "3/5": "#22c55e" }
              return (
                <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 64, textAlign: "right", color: "#4a5568", fontSize: 12, fontWeight: 500 }}>{d.label}</span>
                  <div style={{ flex: 1, height: 22, background: "#141922", borderRadius: 4 }}>
                    <div style={{
                      width: `${Math.max(w, 1)}%`, height: "100%", borderRadius: 4,
                      background: colors[d.edge] ?? "#22c55e",
                      display: "flex", alignItems: "center", paddingLeft: 6,
                    }}>
                      {w > 20 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, fontFamily: "monospace" }}>{(d.mass * 100).toFixed(1)}%</span>}
                    </div>
                  </div>
                  {w <= 20 && <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace" }}>{(d.mass * 100).toFixed(1)}%</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Neighbors */}
        <div style={{ background: "#1a2030", borderRadius: 12, border: "1px solid #1e2636", padding: 20 }}>
          <div style={{ color: "#4a5568", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Similar Hands</div>
          {HANDS.slice(1).map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < 2 ? "1px solid #1e2636" : "none",
            }}>
              <Cards obs={h} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 13, fontFamily: "monospace" }}>
                <span style={{ color: "#4a5568" }}>F::3{String.fromCharCode(97 + i)}</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>{(71 - i).toFixed(1)}%</span>
                <span style={{ color: "#4a5568" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
