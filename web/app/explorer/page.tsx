"use client"

import { useState } from "react"
import Link from "next/link"
import { api, type Sample } from "@/app/lib/api"
import { streetName, streetFromAbs } from "@/app/lib/cards"
import { ObservationDisplay } from "@/app/components/card"
import { EquityBar } from "@/app/components/equity-bar"
import { Histogram } from "@/app/components/histogram"
import { SampleRow } from "@/app/components/sample-row"
import { CardPicker } from "@/app/components/card-picker"
import { BgCanvas } from "@/app/components/bg-canvas"
import { FilmGrain } from "@/app/components/film-grain"

type ExplorerState = {
  sample: Sample
  nearest: Sample[]
  farthest: Sample[]
  histogram: Sample[]
} | null

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: "rgba(201,168,76,0.2)", fontSize: 10, letterSpacing: 4,
      textTransform: "uppercase", marginBottom: 20,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span>{children}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.06)" }} />
    </div>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: "16px 20px",
      border: "1px solid rgba(201,168,76,0.06)",
      background: "rgba(201,168,76,0.01)",
    }}>
      <div style={{ color: "rgba(201,168,76,0.2)", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div className="font-mono tabular-nums" style={{ fontSize: 18, color: "#c9a84c" }}>{value}</div>
      {sub && <div style={{ color: "rgba(201,168,76,0.15)", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function strengthLabel(equity: number): string {
  if (equity >= 0.8) return "Monster"
  if (equity >= 0.65) return "Strong"
  if (equity >= 0.5) return "Marginal+"
  if (equity >= 0.35) return "Marginal"
  if (equity >= 0.2) return "Weak"
  return "Trash"
}

function strengthBar(equity: number) {
  const segments = 5
  const filled = Math.round(equity * segments)
  return Array.from({ length: segments }, (_, i) => i < filled)
}

export default function ExplorerPage() {
  const [input, setInput] = useState("")
  const [street, setStreet] = useState("P")
  const [data, setData] = useState<ExplorerState>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"pick" | "type">("pick")

  async function explore(obs?: string, abs?: string) {
    setLoading(true)
    setError("")
    try {
      let sample: Sample
      if (obs) {
        sample = await api.exploreObs(obs)
      } else if (abs) {
        sample = await api.exploreAbs(abs)
      } else {
        sample = await api.exploreStreet(street)
      }

      const [nearest, farthest, histogram] = await Promise.all([
        api.nearestNeighbors(sample.abs).catch(() => []),
        api.farthestNeighbors(sample.abs).catch(() => []),
        api.histogramObs(sample.obs).catch(() =>
          api.histogramAbs(sample.abs).catch(() => [])
        ),
      ])

      setData({ sample, nearest, farthest, histogram })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) {
      explore(input.trim())
    } else {
      explore()
    }
  }

  return (
    <div className="inner-page">
      <BgCanvas />
      <FilmGrain />

      <nav className="inner-nav">
        <Link href="/" className="inner-nav-wordmark">
          R<span className="one">1</span>VER
        </Link>
        <span className="inner-nav-label">Hand Explorer</span>
      </nav>

      {/* Empty state */}
      {!data && !loading && !error && (
        <main className="inner-main" style={{ maxWidth: 720, paddingTop: 120 }}>
          <div className="inner-header animate-fade-up">
            <div className="inner-section-label">§ 04 · Explorer</div>
            <h1 className="inner-title">
              Hand <span className="em">Explorer</span>
            </h1>
            <p className="inner-subtitle">
              Pick a hand to see its equity and nearest neighbors in abstraction space
            </p>
          </div>

          <div className="animate-fade-up-1 felt-glow">
            <CardPicker onSelect={(obs) => explore(obs)} />
          </div>

          <div className="animate-fade-up-2" style={{ marginTop: 24 }}>
            {mode === "type" ? (
              <div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="AsKd~7h8c2s"
                    className="inner-input flex-1 px-4 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="inner-btn px-5 py-2 text-xs"
                  >
                    Go
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setMode("pick")}
                  className="font-mono mt-3"
                  style={{ color: "rgba(201,168,76,0.12)", fontSize: 10, letterSpacing: 1, background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(201,168,76,0.3)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(201,168,76,0.12)"}
                >
                  back to card picker
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMode("type")}
                className="font-mono"
                style={{ color: "rgba(201,168,76,0.1)", fontSize: 10, letterSpacing: 1, background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(201,168,76,0.25)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(201,168,76,0.1)"}
              >
                or type a hand...
              </button>
            )}
          </div>
        </main>
      )}

      {/* Search bar when data is shown */}
      {(data || loading || error) && (
        <div className="inner-main" style={{ paddingBottom: 0 }}>
          <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
            <div className="flex" style={{ border: "1px solid rgba(201,168,76,0.08)" }}>
              {["P", "F", "T", "R"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStreet(s)}
                  className="px-3 py-2 text-xs font-mono transition-all duration-200"
                  style={{
                    background: street === s ? "rgba(201,168,76,0.06)" : "transparent",
                    color: street === s ? "#c9a84c" : "rgba(201,168,76,0.15)",
                    letterSpacing: 2,
                    borderRight: "1px solid rgba(201,168,76,0.04)",
                  }}
                >
                  {streetName(s)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="AsKd~7h8c2s"
              className="inner-input flex-1 px-4 py-2 text-sm font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="inner-btn px-6 py-2 text-xs"
            >
              {loading ? "···" : input.trim() ? "Explore" : "Random"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="inner-main" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="mb-8 px-5 py-3 text-sm" style={{ border: "1px solid rgba(201,168,76,0.12)", color: "rgba(201,168,76,0.6)", background: "rgba(201,168,76,0.02)" }}>
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="inner-main animate-fade-up" style={{ paddingTop: 0 }}>
          {/* Hero Panel: Cards + Equity */}
          <div className="inner-panel" style={{ padding: "32px 36px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <ObservationDisplay obs={data.sample.obs} />
                <div className="font-mono" style={{ color: "rgba(201,168,76,0.12)", fontSize: 10, letterSpacing: 2, marginTop: 8 }}>
                  {data.sample.obs}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 60, fontWeight: 400, fontFamily: "var(--font-serif), serif",
                  letterSpacing: 2, lineHeight: 1,
                }}>
                  {Math.round(data.sample.equity * 100)}
                  <span style={{ fontSize: 28, color: "rgba(201,168,76,0.4)" }}>
                    .{((data.sample.equity * 1000) % 10).toFixed(0)}%
                  </span>
                </div>
                <div className="font-mono" style={{ color: "rgba(201,168,76,0.15)", fontSize: 9, letterSpacing: 3, marginTop: 6, textTransform: "uppercase" }}>
                  Hand Equity
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <EquityBar value={data.sample.equity} />
            </div>

            {/* Strength indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "rgba(201,168,76,0.3)", fontSize: 12, fontStyle: "italic", fontFamily: "var(--font-serif), serif" }}>{strengthLabel(data.sample.equity)}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {strengthBar(data.sample.equity).map((filled, i) => (
                    <div key={i} style={{
                      width: 12, height: 3,
                      background: filled ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.06)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
              </div>
              <span className="font-mono" style={{ color: "rgba(201,168,76,0.12)", fontSize: 10 }}>
                top {Math.round((1 - data.sample.equity) * 100)}% of hands
              </span>
            </div>
          </div>

          <div className="suit-divider">
            <span className="suit-divider-symbols">♠ ♥ ♦ ♣</span>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "rgba(201,168,76,0.04)" }}>
            <StatBox label="Cluster" value={data.sample.abs} sub={streetName(streetFromAbs(data.sample.abs))} />
            <StatBox label="Equity" value={`${(data.sample.equity * 100).toFixed(1)}%`} sub={strengthLabel(data.sample.equity)} />
            <StatBox label="Density" value={`${(data.sample.density * 100).toFixed(2)}%`} sub="of observation space" />
            <StatBox label="Distance" value={data.sample.distance.toFixed(4)} sub="from centroid" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(201,168,76,0.04)", marginTop: 1 }}>
            <StatBox label="Observation" value={data.sample.obs} />
            <StatBox label="Win Probability" value={`${(data.sample.equity * 100).toFixed(1)}%`} sub={`${((1 - data.sample.equity) * 100).toFixed(1)}% lose`} />
            <StatBox label="Cluster Population" value={`${(data.sample.density * 10000).toFixed(0)}`} sub="observations in cluster" />
          </div>

          {/* Histogram */}
          {data.histogram.length > 0 && (
            <>
              <div className="suit-divider">
                <span className="suit-divider-symbols">♠ ♥ ♦ ♣</span>
              </div>
              <Histogram data={data.histogram} label="Equity Distribution" />
            </>
          )}

          {/* Nearest neighbors */}
          {data.nearest.length > 0 && (
            <>
              <div className="suit-divider">
                <span className="suit-divider-symbols">♠ ♥ ♦ ♣</span>
              </div>
              <SectionLabel>Similar Hands</SectionLabel>
              <div>
                {data.nearest.map((s, i) => (
                  <SampleRow key={i} sample={s} showDistance onClick={() => explore(undefined, s.abs)} />
                ))}
              </div>
            </>
          )}

          {/* Farthest neighbors */}
          {data.farthest.length > 0 && (
            <>
              <div className="suit-divider">
                <span className="suit-divider-symbols">♠ ♥ ♦ ♣</span>
              </div>
              <SectionLabel>Distant Hands</SectionLabel>
              <div>
                {data.farthest.map((s, i) => (
                  <SampleRow key={i} sample={s} showDistance onClick={() => explore(undefined, s.abs)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
