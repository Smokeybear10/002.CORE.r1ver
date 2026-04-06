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
      width: 40, height: 56, background: "rgba(255,255,255,0.05)", color: red ? "#f472b6" : "#e2e8f0",
      fontFamily: "monospace", fontSize: 14, fontWeight: 700, borderRadius: 10,
      border: "1px solid rgba(139,92,246,0.3)",
      boxShadow: "0 0 12px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
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
      {board.length > 0 && <span style={{ color: "rgba(139,92,246,0.3)", margin: "0 6px", fontSize: 18 }}>|</span>}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

function Glass({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 16,
      border: "1px solid rgba(139,92,246,0.2)",
      boxShadow: "0 0 20px rgba(139,92,246,0.05)",
      backdropFilter: "blur(12px)", padding: 28, ...style,
    }}>
      {children}
    </div>
  )
}

export default function NeonPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#09090b", color: "#fafafa", fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: "100vh",
      backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)",
    }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid rgba(139,92,246,0.15)", padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(9,9,11,0.8)", backdropFilter: "blur(12px)",
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>R1VER</span>
        </span>
        <span style={{ color: "#52525b", fontSize: 13 }}>Neon Noir Variant</span>
      </header>

      <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: -0.5 }}>Hand Analysis</h1>
        <p style={{ color: "#52525b", fontSize: 14, marginBottom: 32 }}>Flop stage analysis</p>

        {/* Main panel */}
        <Glass style={{ marginBottom: 24 }}>
          <Cards obs="AsKd~7h8c2s" />

          {/* Equity bar */}
          <div style={{ margin: "24px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
              <div style={{
                width: "72%", height: "100%", borderRadius: 99,
                background: "linear-gradient(90deg, #8b5cf6, #06b6d4)",
                boxShadow: "0 0 16px rgba(139,92,246,0.4)",
              }} />
            </div>
            <span style={{
              background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontWeight: 700, fontSize: 15, fontFamily: "monospace",
            }}>72%</span>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { label: "Cluster", value: "F::3a", sub: "Flop" },
              { label: "Equity", value: "72.0%", sub: "" },
              { label: "Density", value: "1.34%", sub: "of observation space" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ color: "#52525b", fontSize: 11, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{s.value}</div>
                {s.sub && <div style={{ color: "#3f3f46", fontSize: 12 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </Glass>

        {/* Histogram */}
        <Glass style={{ marginBottom: 24 }}>
          <div style={{ color: "#52525b", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Distribution</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
            {HISTOGRAM.map((d, i) => {
              const t = d.equity
              const r = Math.round(139 + (6 - 139) * t)
              const g = Math.round(92 + (182 - 92) * t)
              const b = Math.round(246 + (212 - 246) * t)
              return (
                <div key={i} style={{
                  flex: 1, borderRadius: 4,
                  height: `${Math.max((d.density / maxDensity) * 100, 3)}%`,
                  background: `rgb(${r},${g},${b})`,
                  boxShadow: `0 0 6px rgba(${r},${g},${b},0.3)`,
                }} />
              )
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#27272a", fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
            <span>0% equity</span><span>100% equity</span>
          </div>
        </Glass>

        {/* Action chart */}
        <Glass style={{ marginBottom: 24 }}>
          <div style={{ color: "#52525b", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Optimal Strategy</div>
          {DECISIONS.map(d => {
            const w = (d.mass / maxMass) * 100
            const colors: Record<string, string> = { F: "#ef4444", O: "#52525b", "*": "#8b5cf6", "!": "#f59e0b", "3/5": "#06b6d4" }
            return (
              <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span style={{ width: 80, textAlign: "right", color: "#52525b", fontSize: 13, fontWeight: 500 }}>{d.label}</span>
                <div style={{ flex: 1, height: 28, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                  <div style={{
                    width: `${Math.max(w, 1)}%`, height: "100%", borderRadius: 6,
                    background: colors[d.edge] ?? "#06b6d4",
                    boxShadow: `0 0 10px ${colors[d.edge] ?? "#06b6d4"}44`,
                    display: "flex", alignItems: "center", paddingLeft: 8,
                  }}>
                    {w > 20 && <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "monospace" }}>{(d.mass * 100).toFixed(1)}%</span>}
                  </div>
                </div>
                {w <= 20 && <span style={{ fontSize: 12, color: "#3f3f46", fontFamily: "monospace", width: 40 }}>{(d.mass * 100).toFixed(1)}%</span>}
              </div>
            )
          })}
        </Glass>

        {/* Neighbors */}
        <div>
          <div style={{ color: "#52525b", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Nearest Clusters</div>
          {HANDS.slice(1).map((h, i) => (
            <Glass key={i} style={{ padding: "12px 16px", marginBottom: 8, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Cards obs={h} />
                <div style={{ marginLeft: "auto", display: "flex", gap: 24, fontSize: 13, fontFamily: "monospace" }}>
                  <span style={{ color: "#52525b" }}>F::3{String.fromCharCode(97 + i)}</span>
                  <span style={{ color: "#fafafa", fontWeight: 600 }}>{(71 - i).toFixed(1)}%</span>
                  <span style={{ color: "#3f3f46" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
                </div>
              </div>
            </Glass>
          ))}
        </div>
      </div>
    </div>
  )
}
