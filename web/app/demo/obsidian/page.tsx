"use client"

import { parseObservation, suitSymbol } from "@/app/lib/cards"

const HANDS = ["AsKd~7h8c2s", "AhKs~7h8c2s", "AcKh~7d8s2c", "AdKc~7s8h2d"]
const DECISIONS = [
  { edge: "*", label: "Call", mass: 0.35 },
  { edge: "3/5", label: "Raise", mass: 0.28 },
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
      width: 44, height: 62, background: "#0a0a0a",
      color: red ? "#c9a84c" : "#c9a84c",
      fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 16, fontWeight: 400,
      borderRadius: 6, border: "1px solid rgba(201,168,76,0.2)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      letterSpacing: 1,
    }}>
      {rank}<span style={{ fontSize: 13, marginLeft: 2, opacity: red ? 1 : 0.7 }}>{suitSymbol(suit)}</span>
    </span>
  )
}

function Cards({ obs }: { obs: string }) {
  const { pocket, board } = parseObservation(obs)
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {pocket.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
      {board.length > 0 && (
        <span style={{
          width: 1, height: 32, background: "rgba(201,168,76,0.15)",
          margin: "0 10px",
        }} />
      )}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

function Divider() {
  return (
    <div style={{
      height: 1, margin: "28px 0",
      background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)",
    }} />
  )
}

export default function ObsidianPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#050505", color: "#c9a84c",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      minHeight: "100vh",
    }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid rgba(201,168,76,0.08)", padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 22, fontWeight: 400, letterSpacing: 8 }}>
          R<span style={{ fontFamily: "monospace", fontWeight: 700 }}>1</span>VER
        </span>
        <div style={{ display: "flex", gap: 32, fontSize: 13, letterSpacing: 3, fontWeight: 400 }}>
          <span style={{ color: "#c9a84c" }}>Explorer</span>
          <span style={{ color: "rgba(201,168,76,0.3)" }}>Strategy</span>
        </div>
      </header>

      <div style={{ padding: "48px 40px", maxWidth: 900, margin: "0 auto" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: 2, marginBottom: 6 }}>Hand Analysis</h1>
          <p style={{ color: "rgba(201,168,76,0.3)", fontSize: 13, letterSpacing: 1, fontStyle: "italic" }}>
            Flop stage / As Kd against 7h 8c 2s
          </p>
        </div>

        {/* Cards + Equity */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <Cards obs="AsKd~7h8c2s" />
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 48, fontWeight: 400, fontFamily: "'Georgia', serif",
              letterSpacing: 2, color: "#c9a84c",
            }}>
              72<span style={{ fontSize: 24, color: "rgba(201,168,76,0.5)" }}>.0%</span>
            </div>
          </div>
        </div>

        {/* Equity line */}
        <div style={{ height: 1, background: "rgba(201,168,76,0.06)", marginBottom: 4, position: "relative" as const }}>
          <div style={{
            width: "72%", height: 1, background: "#c9a84c",
            boxShadow: "0 0 8px rgba(201,168,76,0.3)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 0 }}>
          <span style={{ fontSize: 9, color: "rgba(201,168,76,0.15)", letterSpacing: 2 }}>0</span>
          <span style={{ fontSize: 9, color: "rgba(201,168,76,0.15)", letterSpacing: 2 }}>100</span>
        </div>

        <Divider />

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 0 }}>
          {[
            { label: "Cluster", value: "F::3a" },
            { label: "Equity", value: "72.0%" },
            { label: "Density", value: "1.34%" },
            { label: "Distance", value: "0.0000" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 400, color: "#c9a84c" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Histogram */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
            Distribution
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
            {HISTOGRAM.map((d, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 1,
                height: `${Math.max((d.density / maxDensity) * 100, 2)}%`,
                background: d.equity < 0.33
                  ? "rgba(201,168,76,0.15)"
                  : d.equity < 0.66
                    ? "rgba(201,168,76,0.35)"
                    : "#c9a84c",
                boxShadow: d.equity > 0.66 ? "0 0 4px rgba(201,168,76,0.2)" : "none",
              }} />
            ))}
          </div>
        </div>

        <Divider />

        {/* Strategy */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>
            Optimal Strategy
          </div>
          {DECISIONS.map(d => {
            const w = (d.mass / maxMass) * 100
            return (
              <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                <span style={{
                  width: 64, textAlign: "right", fontSize: 13, fontStyle: "italic",
                  color: "rgba(201,168,76,0.4)", fontFamily: "'Georgia', serif",
                }}>{d.label}</span>
                <div style={{ flex: 1, height: 20, background: "rgba(201,168,76,0.03)" }}>
                  <div style={{
                    width: `${Math.max(w, 1)}%`, height: "100%",
                    background: d.edge === "F"
                      ? "rgba(201,168,76,0.15)"
                      : d.edge === "O"
                        ? "rgba(201,168,76,0.1)"
                        : "rgba(201,168,76,0.5)",
                    display: "flex", alignItems: "center", paddingLeft: 8,
                  }}>
                    {w > 20 && (
                      <span style={{ fontSize: 10, color: "#050505", fontFamily: "monospace", fontWeight: 700 }}>
                        {(d.mass * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                {w <= 20 && (
                  <span style={{ fontSize: 10, color: "rgba(201,168,76,0.2)", fontFamily: "monospace" }}>
                    {(d.mass * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <Divider />

        {/* Neighbors */}
        <div>
          <div style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>
            Similar Hands
          </div>
          {HANDS.slice(1).map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "14px 0",
              borderBottom: i < 2 ? "1px solid rgba(201,168,76,0.05)" : "none",
            }}>
              <Cards obs={h} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 28, fontSize: 13, fontFamily: "monospace" }}>
                <span style={{ color: "rgba(201,168,76,0.2)" }}>F::3{String.fromCharCode(97 + i)}</span>
                <span style={{ color: "#c9a84c" }}>{(71 - i).toFixed(1)}%</span>
                <span style={{ color: "rgba(201,168,76,0.15)" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 60, textAlign: "center", paddingBottom: 40,
        }}>
          <div style={{
            display: "inline-block", padding: "12px 32px",
            border: "1px solid rgba(201,168,76,0.1)",
            color: "rgba(201,168,76,0.2)", fontSize: 10, letterSpacing: 4,
          }}>
            R1VER
          </div>
        </div>
      </div>
    </div>
  )
}
