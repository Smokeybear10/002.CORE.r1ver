"use client"

import { parseObservation, suitSymbol } from "@/app/lib/cards"

const HANDS = ["AsKd~7h8c2s", "AhKs~7h8c2s", "AcKh~7d8s2c", "AdKc~7s8h2d"]
const DECISIONS = [
  { edge: "*", label: "CALL", mass: 0.35 },
  { edge: "3/5", label: "RAISE 3/5", mass: 0.28 },
  { edge: "!", label: "SHOVE", mass: 0.17 },
  { edge: "F", label: "FOLD", mass: 0.12 },
  { edge: "O", label: "CHECK", mass: 0.08 },
]
const HISTOGRAM = Array.from({ length: 40 }, (_, i) => ({
  equity: i / 39,
  density: Math.random() * 0.05 + (i > 12 && i < 25 ? 0.04 : 0.01),
}))

function Card({ rank, suit }: { rank: string; suit: string }) {
  const red = suit === "h" || suit === "d"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 36, height: 50, background: "#fff", color: red ? "#ff0000" : "#000",
      fontFamily: "monospace", fontSize: 13, fontWeight: 700, borderRadius: 2,
    }}>
      {rank}{suitSymbol(suit)}
    </span>
  )
}

function Cards({ obs }: { obs: string }) {
  const { pocket, board } = parseObservation(obs)
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {pocket.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
      {board.length > 0 && <span style={{ color: "#333", margin: "0 4px" }}>|</span>}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

export default function BloombergPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#000", color: "#00ff88", fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      minHeight: "100vh", padding: 0,
    }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "0 20px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2 }}>
          <span style={{ color: "#00d4ff" }}>R1</span>
          <span style={{ color: "#00ff88" }}>VER</span>
          <span style={{ color: "#333", marginLeft: 12, fontSize: 11 }}>TERMINAL</span>
        </span>
        <span style={{ color: "#333", fontSize: 11 }}>BLOOMBERG TERMINAL VARIANT</span>
      </header>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ color: "#333", fontSize: 11, marginBottom: 16, borderBottom: "1px solid #111", paddingBottom: 8 }}>
          HAND ANALYSIS // FLOP // {new Date().toISOString().split("T")[0]}
        </div>

        {/* Cards */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#444", fontSize: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: 2 }}>Position</div>
          <Cards obs="AsKd~7h8c2s" />
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "#111", marginBottom: 20 }}>
          {[
            { label: "CLUSTER", value: "F::3a", sub: "FLOP" },
            { label: "EQUITY", value: "72.0%", sub: "+0.22" },
            { label: "DENSITY", value: "1.34%", sub: "OBS SPACE" },
            { label: "DISTANCE", value: "0.0000", sub: "CENTROID" },
          ].map(s => (
            <div key={s.label} style={{ background: "#000", padding: "10px 12px" }}>
              <div style={{ color: "#333", fontSize: 9, letterSpacing: 2 }}>{s.label}</div>
              <div style={{ color: "#00ff88", fontSize: 20, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "#1a4a2a", fontSize: 10 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Equity bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>EQUITY</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: "#111" }}>
              <div style={{ width: "72%", height: "100%", background: "#00d4ff" }} />
            </div>
            <span style={{ color: "#00d4ff", fontSize: 12 }}>72%</span>
          </div>
        </div>

        {/* Histogram */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>DISTRIBUTION // NEXT STREET</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 100 }}>
            {HISTOGRAM.map((d, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 0,
                height: `${Math.max((d.density / maxDensity) * 100, 2)}%`,
                background: d.equity < 0.33 ? "#004422" : d.equity < 0.66 ? "#006633" : "#00ff88",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#222", fontSize: 9, marginTop: 2 }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>

        {/* Action chart */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>OPTIMAL STRATEGY</div>
          {DECISIONS.map(d => {
            const w = (d.mass / maxMass) * 100
            const colors: Record<string, string> = { F: "#ff0044", O: "#444", "*": "#00d4ff", "!": "#ffaa00", "3/5": "#00ff88" }
            return (
              <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 80, textAlign: "right", color: "#555", fontSize: 11 }}>{d.label}</span>
                <div style={{ flex: 1, height: 20, background: "#0a0a0a" }}>
                  <div style={{
                    width: `${Math.max(w, 1)}%`, height: "100%",
                    background: colors[d.edge] ?? "#00ff88",
                    display: "flex", alignItems: "center", paddingLeft: 6,
                  }}>
                    {w > 20 && <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>{(d.mass * 100).toFixed(1)}%</span>}
                  </div>
                </div>
                {w <= 20 && <span style={{ fontSize: 10, color: "#333", width: 40 }}>{(d.mass * 100).toFixed(1)}%</span>}
              </div>
            )
          })}
        </div>

        {/* Neighbors */}
        <div>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>NEAREST CLUSTERS</div>
          {HANDS.slice(1).map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
              borderBottom: "1px solid #111",
            }}>
              <Cards obs={h} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 11 }}>
                <span style={{ color: "#333" }}>F::3{String.fromCharCode(97 + i)}</span>
                <span style={{ color: "#00ff88" }}>{(71 - i).toFixed(1)}%</span>
                <span style={{ color: "#333" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
