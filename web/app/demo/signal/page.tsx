"use client"

import { parseObservation, suitSymbol } from "@/app/lib/cards"

const HANDS = ["AsKd~7h8c2s", "AhKs~7h8c2s", "AcKh~7d8s2c", "AdKc~7s8h2d"]
const DECISIONS = [
  { edge: "*", label: "CALL", mass: 0.35 },
  { edge: "3/5", label: "RAISE", mass: 0.28 },
  { edge: "!", label: "SHOVE", mass: 0.17 },
  { edge: "F", label: "FOLD", mass: 0.12 },
  { edge: "O", label: "CHECK", mass: 0.08 },
]
const sr = (i: number) => Math.abs(Math.sin(i * 127.1 + 311.7))
const HISTOGRAM = Array.from({ length: 36 }, (_, i) => ({
  equity: i / 35,
  density: sr(i) * 0.05 + (i > 12 && i < 24 ? 0.04 : 0.01),
}))

function Card({ rank, suit }: { rank: string; suit: string }) {
  const red = suit === "h" || suit === "d"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 38, height: 54, background: "rgba(57,255,20,0.03)",
      color: red ? "#ff3366" : "#39ff14",
      fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700,
      border: "1px solid rgba(57,255,20,0.25)", borderRadius: 3,
      boxShadow: "0 0 8px rgba(57,255,20,0.08), inset 0 0 20px rgba(57,255,20,0.02)",
      position: "relative" as const,
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
      {board.length > 0 && <span style={{ color: "rgba(57,255,20,0.15)", margin: "0 8px", fontFamily: "monospace", fontSize: 12 }}>///</span>}
      {board.map((c, i) => <Card key={`b${i}`} rank={c.rank} suit={c.suit} />)}
    </span>
  )
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" as const, padding: 24, marginBottom: 20 }}>
      {/* Corner brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: "1px solid rgba(57,255,20,0.4)", borderLeft: "1px solid rgba(57,255,20,0.4)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderTop: "1px solid rgba(57,255,20,0.4)", borderRight: "1px solid rgba(57,255,20,0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 16, height: 16, borderBottom: "1px solid rgba(57,255,20,0.4)", borderLeft: "1px solid rgba(57,255,20,0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: "1px solid rgba(57,255,20,0.4)", borderRight: "1px solid rgba(57,255,20,0.4)" }} />
      {/* Label */}
      <div style={{
        position: "absolute", top: -8, left: 24,
        background: "#030303", padding: "0 8px",
        color: "rgba(57,255,20,0.5)", fontSize: 9, letterSpacing: 3,
        textTransform: "uppercase", fontFamily: "monospace",
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export default function SignalPage() {
  const maxMass = Math.max(...DECISIONS.map(d => d.mass))
  const maxDensity = Math.max(...HISTOGRAM.map(d => d.density))

  return (
    <div style={{
      background: "#030303", color: "#39ff14", fontFamily: "'Courier New', monospace",
      minHeight: "100vh",
      backgroundImage: "radial-gradient(circle at 1px 1px, rgba(57,255,20,0.03) 1px, transparent 0)",
      backgroundSize: "24px 24px",
    }}>
      {/* Nav */}
      <header style={{
        borderBottom: "1px solid rgba(57,255,20,0.1)", padding: "0 24px", height: 48,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "#39ff14", boxShadow: "0 0 8px #39ff14" }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 4 }}>R1VER</span>
          <span style={{ color: "rgba(57,255,20,0.2)", fontSize: 10, letterSpacing: 2 }}>SIGNAL</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, letterSpacing: 2 }}>
          <span style={{ color: "rgba(57,255,20,0.6)" }}>SYS.ONLINE</span>
          <span style={{ color: "rgba(57,255,20,0.2)" }}>{new Date().toISOString().replace("T", " ").slice(0, 19)}</span>
        </div>
      </header>

      <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>
        {/* Status line */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
          color: "rgba(57,255,20,0.3)", fontSize: 10, letterSpacing: 2,
        }}>
          <span>ANALYSIS</span>
          <span style={{ color: "rgba(57,255,20,0.1)" }}>&gt;&gt;</span>
          <span>FLOP</span>
          <span style={{ color: "rgba(57,255,20,0.1)" }}>&gt;&gt;</span>
          <span style={{ color: "rgba(57,255,20,0.6)" }}>ACTIVE</span>
        </div>

        {/* Main panel */}
        <Panel label="Observation">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Cards obs="AsKd~7h8c2s" />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#39ff14", textShadow: "0 0 20px rgba(57,255,20,0.3)" }}>72.0<span style={{ fontSize: 18 }}>%</span></div>
              <div style={{ color: "rgba(57,255,20,0.3)", fontSize: 9, letterSpacing: 2 }}>EQUITY READING</div>
            </div>
          </div>

          {/* Equity bar */}
          <div style={{ margin: "20px 0 0", height: 3, background: "rgba(57,255,20,0.06)" }}>
            <div style={{
              width: "72%", height: "100%", background: "#39ff14",
              boxShadow: "0 0 10px rgba(57,255,20,0.5), 0 0 30px rgba(57,255,20,0.2)",
            }} />
          </div>
        </Panel>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "CLUSTER", value: "F::3a" },
            { label: "STREET", value: "FLOP" },
            { label: "DENSITY", value: "1.34%" },
            { label: "DISTANCE", value: "0.0000" },
          ].map(s => (
            <div key={s.label} style={{
              border: "1px solid rgba(57,255,20,0.08)", padding: "12px 14px",
              background: "rgba(57,255,20,0.01)",
            }}>
              <div style={{ color: "rgba(57,255,20,0.3)", fontSize: 8, letterSpacing: 2, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#39ff14" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Histogram */}
        <Panel label="Distribution // Next Street">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
            {HISTOGRAM.map((d, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${Math.max((d.density / maxDensity) * 100, 2)}%`,
                background: d.equity < 0.33
                  ? "rgba(255,51,102,0.6)"
                  : d.equity < 0.66
                    ? "rgba(57,255,20,0.4)"
                    : "#39ff14",
                boxShadow: d.equity > 0.66 ? "0 0 4px rgba(57,255,20,0.3)" : "none",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(57,255,20,0.15)", fontSize: 9, marginTop: 6 }}>
            <span>0%</span><span>EQUITY AXIS</span><span>100%</span>
          </div>
        </Panel>

        {/* Actions */}
        <Panel label="Optimal Strategy">
          {DECISIONS.map(d => {
            const w = (d.mass / maxMass) * 100
            const colors: Record<string, string> = {
              F: "#ff3366", O: "rgba(57,255,20,0.3)", "*": "#39ff14",
              "!": "#ffaa00", "3/5": "#00ffaa",
            }
            const glows: Record<string, string> = {
              F: "rgba(255,51,102,0.3)", "*": "rgba(57,255,20,0.3)",
              "!": "rgba(255,170,0,0.3)", "3/5": "rgba(0,255,170,0.3)",
            }
            return (
              <div key={d.edge} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <span style={{ width: 56, textAlign: "right", color: "rgba(57,255,20,0.4)", fontSize: 10, letterSpacing: 1 }}>{d.label}</span>
                <div style={{ flex: 1, height: 18, background: "rgba(57,255,20,0.02)", border: "1px solid rgba(57,255,20,0.05)" }}>
                  <div style={{
                    width: `${Math.max(w, 1)}%`, height: "100%",
                    background: colors[d.edge] ?? "#39ff14",
                    boxShadow: `0 0 8px ${glows[d.edge] ?? "rgba(57,255,20,0.2)"}`,
                    display: "flex", alignItems: "center", paddingLeft: 6,
                  }}>
                    {w > 18 && <span style={{ fontSize: 9, color: "#000", fontWeight: 700 }}>{(d.mass * 100).toFixed(1)}%</span>}
                  </div>
                </div>
                {w <= 18 && <span style={{ fontSize: 9, color: "rgba(57,255,20,0.25)", width: 36 }}>{(d.mass * 100).toFixed(1)}%</span>}
              </div>
            )
          })}
        </Panel>

        {/* Neighbors */}
        <Panel label="Nearest Clusters">
          {HANDS.slice(1).map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < 2 ? "1px solid rgba(57,255,20,0.05)" : "none",
            }}>
              <span style={{ color: "rgba(57,255,20,0.2)", fontSize: 9, width: 16 }}>{String(i + 1).padStart(2, "0")}</span>
              <Cards obs={h} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 11 }}>
                <span style={{ color: "rgba(57,255,20,0.25)" }}>F::3{String.fromCharCode(97 + i)}</span>
                <span style={{ color: "#39ff14" }}>{(71 - i).toFixed(1)}%</span>
                <span style={{ color: "rgba(57,255,20,0.15)" }}>{(0.002 + i * 0.003).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </Panel>

        {/* Footer */}
        <div style={{ color: "rgba(57,255,20,0.1)", fontSize: 9, letterSpacing: 2, textAlign: "center", marginTop: 40 }}>
          R1VER POKER AI // SIGNAL INTERFACE // CLASSIFIED
        </div>
      </div>
    </div>
  )
}
