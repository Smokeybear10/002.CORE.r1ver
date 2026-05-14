"use client"

import { useState } from "react"
import Link from "next/link"
import { api, type Decision } from "@/app/lib/api"
import { BgCanvas } from "@/app/components/bg-canvas"
import { FilmGrain } from "@/app/components/film-grain"

type StrategyState = {
  decisions: Decision[]
  hand: string
  history: string[]
  turn: string
} | null

type StreetBlock = {
  name: string
  actions: string[]
  board: string
}

const STREETS = ["Preflop", "Flop", "Turn", "River"]

function parseHistory(actions: string[]): StreetBlock[] {
  const streets: StreetBlock[] = [{ name: "Preflop", actions: [], board: "" }]
  for (const a of actions) {
    if (a.toUpperCase().startsWith("DEAL")) {
      const cards = a.slice(4).trim()
      const prevBoard = streets[streets.length - 1].board
      const nextName = STREETS[streets.length] ?? "River"
      streets.push({ name: nextName, actions: [a], board: prevBoard + cards })
    } else {
      streets[streets.length - 1].actions.push(a)
    }
  }
  return streets
}

function formatBoard(board: string): string {
  if (!board) return ""
  return board.match(/.{2}/g)?.join(" ") ?? board
}

function parsePocket(hand: string): string {
  return hand.split("~")[0] ?? hand
}

const ACTION_LABELS: Record<string, string> = {
  F: "Fold",
  O: "Check",
  "*": "Call",
  "!": "Shove",
}

function actionLabel(edge: string): string {
  if (edge in ACTION_LABELS) return ACTION_LABELS[edge]
  return `Raise ${edge}`
}

function VerdictBlock({ decisions }: { decisions: Decision[] }) {
  const sorted = [...decisions].sort((a, b) => b.mass - a.mass)
  const maxMass = Math.max(...sorted.map(d => d.mass), 0.001)
  return (
    <div style={{
      marginTop: 14, padding: "22px 26px",
      border: "1px solid rgba(201,168,76,0.18)",
      background:
        "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(201,168,76,0.012) 10px, rgba(201,168,76,0.012) 11px), rgba(201,168,76,0.02)",
    }}>
      <div className="font-mono" style={{
        fontSize: 9, letterSpacing: 4, textTransform: "uppercase",
        color: "rgba(201,168,76,0.3)", marginBottom: 16,
      }}>
        Distribution
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((d, i) => {
          const pct = (d.mass * 100).toFixed(1)
          const w = (d.mass / maxMass) * 100
          const isTop = i === 0
          return (
            <div key={d.edge} style={{
              display: "grid", gridTemplateColumns: "90px 1fr 52px",
              gap: 14, alignItems: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-serif), serif",
                fontStyle: isTop ? "normal" : "italic",
                fontSize: 13,
                color: isTop ? "#c9a84c" : "rgba(201,168,76,0.55)",
                textAlign: "right",
              }}>
                {actionLabel(d.edge)}
              </span>
              <div style={{ height: 4, background: "rgba(201,168,76,0.04)" }}>
                <div className="animate-bar-grow" style={{
                  height: "100%", width: `${Math.max(w, 1)}%`,
                  background: isTop
                    ? "linear-gradient(90deg, rgba(201,168,76,0.4), #c9a84c)"
                    : "rgba(201,168,76,0.35)",
                  boxShadow: isTop ? "0 0 6px rgba(201,168,76,0.2)" : "none",
                  animationDelay: `${i * 80}ms`,
                }} />
              </div>
              <span className="font-mono tabular-nums" style={{
                fontSize: 12, color: "#c9a84c", textAlign: "right", fontWeight: 500,
              }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StreetRow({
  name, subtitle, actionChips, variant, decisions, isFirst, isLast,
}: {
  name: string
  subtitle: string
  actionChips: string[]
  variant: "past" | "now" | "pending"
  decisions?: Decision[]
  isFirst?: boolean
  isLast?: boolean
}) {
  const dotStyle = {
    past: { background: "rgba(201,168,76,0.25)", borderColor: "rgba(201,168,76,0.4)", boxShadow: "none" },
    now: { background: "#c9a84c", borderColor: "#c9a84c", boxShadow: "0 0 12px rgba(201,168,76,0.5)" },
    pending: { background: "#050505", borderColor: "rgba(201,168,76,0.3)", boxShadow: "none" },
  }[variant]

  const labelColor = variant === "pending" ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.25)"
  const subColor = variant === "pending"
    ? "rgba(201,168,76,0.12)"
    : variant === "now"
      ? "#c9a84c"
      : "rgba(201,168,76,0.45)"

  return (
    <div style={{ position: "relative", padding: "18px 0", minHeight: 64 }}>
      {!isFirst && (
        <div style={{
          position: "absolute", left: -41, top: 0, height: 29, width: 1,
          background: "rgba(201,168,76,0.15)",
        }} />
      )}
      {!isLast && (
        <div style={{
          position: "absolute", left: -41, top: 29, bottom: 0, width: 1,
          background: "rgba(201,168,76,0.15)",
        }} />
      )}
      <div style={{
        position: "absolute", left: -180, top: 20, width: 120, textAlign: "right",
      }}>
        <div className="font-mono" style={{
          fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
          color: labelColor, marginBottom: 4,
        }}>
          {name}
        </div>
        <div className="font-mono" style={{
          fontSize: 10, color: subColor, letterSpacing: 1,
          fontStyle: variant === "now" ? "italic" : "normal",
        }}>
          {subtitle}
        </div>
      </div>
      <div style={{
        position: "absolute", left: -46, top: 24,
        width: 10, height: 10, borderRadius: 99, border: "1px solid", ...dotStyle,
      }} />
      {actionChips.length > 0 ? (
        <div style={{ lineHeight: 1.8 }}>
          {actionChips.map((a, i) => (
            <span key={i} className="font-mono" style={{
              display: "inline-block", padding: "3px 10px", marginRight: 6, marginBottom: 4,
              border: "1px solid rgba(201,168,76,0.08)", fontSize: 10,
              letterSpacing: 1, color: "rgba(201,168,76,0.4)",
            }}>
              {a}
            </span>
          ))}
        </div>
      ) : variant === "pending" ? (
        <div style={{
          fontFamily: "var(--font-serif), serif", fontSize: 14,
          color: "rgba(201,168,76,0.15)", fontStyle: "italic", paddingTop: 4,
        }}>
          —
        </div>
      ) : null}
      {variant === "now" && decisions && (
        <>
          <div style={{
            marginTop: actionChips.length > 0 ? 16 : 4,
            fontFamily: "var(--font-serif), serif", fontSize: 15,
            color: "#c9a84c", fontStyle: "italic",
          }}>
            The solver recommends:
          </div>
          <VerdictBlock decisions={decisions} />
        </>
      )}
    </div>
  )
}

export default function StrategyPage() {
  const [turn, setTurn] = useState("P0")
  const [hand, setHand] = useState("")
  const [actions, setActions] = useState("")
  const [data, setData] = useState<StrategyState>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function query(e: React.FormEvent) {
    e.preventDefault()
    if (!hand.trim()) return

    setLoading(true)
    setError("")
    try {
      const past = actions.split(",").map(a => a.trim()).filter(Boolean)
      const decisions = await api.blueprint(turn, hand.trim(), past)
      setData({ decisions, hand: hand.trim(), history: past, turn })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const streets = data ? parseHistory(data.history) : []
  const nextStreetName = data && streets.length < 4 ? STREETS[streets.length] : null
  const currentStreet = streets[streets.length - 1]
  const pocket = data ? parsePocket(data.hand) : ""

  return (
    <div className="inner-page">
      <BgCanvas />
      <FilmGrain />

      <nav className="inner-nav">
        <Link href="/" className="inner-nav-wordmark">
          R<span className="one">1</span>VER
        </Link>
        <span className="inner-nav-label">Strategy Viewer</span>
      </nav>

      <div className="inner-main">
        {/* Header */}
        <div className="inner-header animate-fade-up">
          <div className="inner-section-label">R1VER | Strategy</div>
          <h1 className="inner-title">
            The solver&apos;s <span className="em">blueprint.</span>
          </h1>
          <p className="inner-subtitle">
            Query the solver&apos;s blueprint strategy for any game state
          </p>
        </div>

        {/* Input form panel */}
        <div className="inner-panel animate-fade-up-1" style={{ marginBottom: 32 }}>
          <form onSubmit={query} className="flex flex-col gap-5">
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 items-center">
              <label className="font-mono" style={{ color: "rgba(201,168,76,0.2)", fontSize: 10, textAlign: "right", letterSpacing: 3, textTransform: "uppercase" }}>Player</label>
              <div className="flex" style={{ border: "1px solid rgba(201,168,76,0.08)", width: "fit-content" }}>
                {["P0", "P1"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTurn(p)}
                    className="px-4 py-2.5 text-xs font-mono transition-all duration-200"
                    style={{
                      background: turn === p ? "rgba(201,168,76,0.06)" : "transparent",
                      color: turn === p ? "#c9a84c" : "rgba(201,168,76,0.15)",
                      letterSpacing: 2,
                      borderRight: "1px solid rgba(201,168,76,0.04)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <label className="font-mono" style={{ color: "rgba(201,168,76,0.2)", fontSize: 10, textAlign: "right", letterSpacing: 3, textTransform: "uppercase" }}>Hand</label>
              <input
                type="text"
                value={hand}
                onChange={(e) => setHand(e.target.value)}
                placeholder="AsKd~7h8c2s"
                className="inner-input px-4 py-2.5 text-sm"
              />

              <label className="font-mono" style={{ color: "rgba(201,168,76,0.2)", fontSize: 10, textAlign: "right", letterSpacing: 3, textTransform: "uppercase" }}>History</label>
              <input
                type="text"
                value={actions}
                onChange={(e) => setActions(e.target.value)}
                placeholder="BLIND 1, BLIND 2, RAISE 6, CALL 4"
                className="inner-input px-4 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hand.trim()}
              className="inner-btn self-start px-7 py-2.5 text-xs"
            >
              {loading ? "···" : "Get Strategy"}
            </button>
          </form>

          <div className="mt-6 space-y-1 font-mono" style={{ color: "rgba(201,168,76,0.12)", fontSize: 11 }}>
            <p><span style={{ color: "rgba(201,168,76,0.25)" }}>Format:</span> pocket~board e.g. AsKd~7h8c2s</p>
            <p><span style={{ color: "rgba(201,168,76,0.25)" }}>Actions:</span> BLIND 1, CALL 4, RAISE 10, CHECK, FOLD, SHOVE 100, DEAL 7h8c2s</p>
          </div>
        </div>

        {error && (
          <div className="mb-8 px-5 py-3 text-sm animate-fade-up" style={{
            border: "1px solid rgba(201,168,76,0.12)",
            color: "rgba(201,168,76,0.6)",
            background: "rgba(201,168,76,0.02)",
          }}>
            {error}
          </div>
        )}

        {data && currentStreet && (
          <div className="animate-fade-up">
            <div className="suit-divider">
              <span className="suit-divider-symbols">♠ ♥ ♦ ♣</span>
            </div>

            {/* Timeline header */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                fontFamily: "var(--font-serif), serif", fontSize: 32, fontWeight: 400,
                color: "#c9a84c", letterSpacing: 1, marginBottom: 6,
              }}>
                {pocket}
                <span style={{ color: "rgba(201,168,76,0.3)", margin: "0 12px", fontSize: 24 }}>→</span>
                {currentStreet.name} decision
              </div>
              <div className="font-mono" style={{
                fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
                color: "rgba(201,168,76,0.25)",
              }}>
                {data.turn} · Blueprint v0.1
              </div>
            </div>

            {/* Timeline track */}
            <div style={{ position: "relative", paddingLeft: 180 }}>
              {streets.map((street, i) => {
                const isCurrent = i === streets.length - 1
                const isFirst = i === 0
                const isLast = isCurrent && !nextStreetName
                const subtitle = isCurrent
                  ? `${data.turn} to act`
                  : street.board
                    ? formatBoard(street.board)
                    : "—"
                return (
                  <StreetRow
                    key={i}
                    name={street.name}
                    subtitle={subtitle}
                    actionChips={street.actions}
                    variant={isCurrent ? "now" : "past"}
                    decisions={isCurrent ? data.decisions : undefined}
                    isFirst={isFirst}
                    isLast={isLast}
                  />
                )
              })}
              {nextStreetName && (
                <StreetRow
                  name={nextStreetName}
                  subtitle="pending"
                  actionChips={[]}
                  variant="pending"
                  isLast
                />
              )}
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-28 animate-fade-up-2">
            <div style={{
              width: 80, height: 80, borderRadius: 99, marginBottom: 32,
              border: "1px solid rgba(201,168,76,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "radial-gradient(circle, rgba(201,168,76,0.03), transparent)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 99,
                border: "1px solid rgba(201,168,76,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(201,168,76,0.05)",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 99, background: "rgba(201,168,76,0.3)" }} />
              </div>
            </div>
            <p style={{ color: "rgba(201,168,76,0.25)", fontSize: 18, fontStyle: "italic", marginBottom: 8, fontFamily: "var(--font-serif), serif" }}>
              Enter a hand and action history
            </p>
            <p style={{ color: "rgba(201,168,76,0.12)", fontSize: 13 }}>
              The solver returns its learned strategy distribution
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="inner-footer">
        <span className="inner-footer-wordmark">R<span className="one">1</span>VER</span>
        <span>Thomas Ou · MMXXVI</span>
        <span className="inner-footer-links">
          <a href="https://thomasou.com" target="_blank" rel="noopener noreferrer">thomasou.com</a>
          <a href="https://github.com/Smokeybear10" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://www.linkedin.com/in/thomasou0/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </span>
      </footer>
    </div>
  )
}
