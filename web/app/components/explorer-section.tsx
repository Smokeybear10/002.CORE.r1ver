"use client"

import { Fragment, useState, useMemo } from "react"
import { SplitText } from "./split-text"

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const
const SUITS = [
  { s: "♠", name: "s", red: false },
  { s: "♥", name: "h", red: true },
  { s: "♦", name: "d", red: true },
  { s: "♣", name: "c", red: false },
] as const

type Mode = "pocket" | "board"

type Neighbor = {
  hand: string
  board: string
  equity: number
  distance: number
}

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i)
  return Math.abs(h)
}

function mockEquity(pocket: string[], board: string[]): number {
  const h = hash(pocket.join("") + board.join(""))
  return 35 + (h % 50) + (h % 100) / 100
}

function mockCluster(pocket: string[], board: string[]): string {
  const h = hash(pocket.join("") + board.join(""))
  const prefix = board.length > 0 ? "F" : "P"
  return prefix + "." + String(h % 2000).padStart(4, "0")
}

function mockNeighbors(equity: number, seed: number): Neighbor[] {
  const pseudoRand = (n: number) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280
    return x - Math.floor(x)
  }
  const neighbors: Neighbor[] = []
  for (let i = 0; i < 5; i++) {
    const k = i * 10
    const r1 = RANKS[Math.floor(pseudoRand(k) * 6)]
    const r2 = RANKS[Math.floor(pseudoRand(k + 1) * 6)]
    const s1 = ["s", "h", "d", "c"][Math.floor(pseudoRand(k + 2) * 4)]
    const s2 = ["s", "h", "d", "c"][Math.floor(pseudoRand(k + 3) * 4)]
    const b1 = RANKS[5 + Math.floor(pseudoRand(k + 4) * 8)]
    const b2 = RANKS[5 + Math.floor(pseudoRand(k + 5) * 8)]
    const b3 = RANKS[5 + Math.floor(pseudoRand(k + 6) * 8)]
    const bs1 = ["s", "h", "d", "c"][Math.floor(pseudoRand(k + 7) * 4)]
    const bs2 = ["s", "h", "d", "c"][Math.floor(pseudoRand(k + 8) * 4)]
    const bs3 = ["s", "h", "d", "c"][Math.floor(pseudoRand(k + 9) * 4)]
    neighbors.push({
      hand: r1 + s1 + r2 + s2,
      board: b1 + bs1 + " " + b2 + bs2 + " " + b3 + bs3,
      equity: equity + (pseudoRand(k + 10) - 0.5) * 4,
      distance: 0.003 + i * 0.005 + pseudoRand(k + 11) * 0.003,
    })
  }
  return neighbors.sort((a, b) => a.distance - b.distance)
}

function suitIcon(s: string): string {
  if (s === "s") return "♠"
  if (s === "h") return "♥"
  if (s === "d") return "♦"
  return "♣"
}

function isRed(s: string): boolean {
  return s === "h" || s === "d"
}

function FormattedCard({ card }: { card: string }) {
  const r = card[0]
  const s = card[1]
  const icon = suitIcon(s)
  if (isRed(s)) {
    return (
      <>
        {r}
        <span className="suit-r">{icon}</span>
      </>
    )
  }
  return <>{r + icon}</>
}

function FormattedBoard({ board }: { board: string }) {
  return (
    <>
      {board.split(" ").map((c, i) => (
        <span key={i}>
          {i > 0 && " "}
          <FormattedCard card={c} />
        </span>
      ))}
    </>
  )
}

export function ExplorerSection() {
  const [mode, setMode] = useState<Mode>("pocket")
  const [pocket, setPocket] = useState<string[]>([])
  const [board, setBoard] = useState<string[]>([])

  const toggleCard = (card: string) => {
    if (pocket.includes(card)) {
      setPocket(pocket.filter((c) => c !== card))
      return
    }
    if (board.includes(card)) {
      setBoard(board.filter((c) => c !== card))
      return
    }
    if (mode === "pocket") {
      if (pocket.length < 2) setPocket([...pocket, card])
    } else {
      if (board.length < 3) setBoard([...board, card])
    }
  }

  const reset = () => {
    setPocket([])
    setBoard([])
  }

  const { equity, cluster, seed } = useMemo(() => {
    if (pocket.length !== 2) return { equity: 0, cluster: "—", seed: 0 }
    const h = hash(pocket.join("") + board.join(""))
    return {
      equity: mockEquity(pocket, board),
      cluster: mockCluster(pocket, board),
      seed: h,
    }
  }, [pocket, board])

  const distance = useMemo(() => {
    if (seed === 0) return "—"
    const x = Math.sin(seed * 13) * 10000
    return (0.01 + (x - Math.floor(x)) * 0.08).toFixed(3) + "σ"
  }, [seed])

  const population = useMemo(() => {
    if (seed === 0) return "—"
    const x = Math.sin(seed * 7) * 10000
    return (Math.floor((x - Math.floor(x)) * 3000) + 500).toLocaleString()
  }, [seed])

  const density = useMemo(() => {
    if (seed === 0) return "—"
    const x = Math.sin(seed * 3) * 10000
    return ((x - Math.floor(x)) * 0.5 + 0.05).toFixed(2) + "%"
  }, [seed])

  const neighbors = useMemo(() => {
    if (pocket.length !== 2 || board.length !== 3) return []
    return mockNeighbors(equity, seed)
  }, [pocket, board, equity, seed])

  const solveState =
    pocket.length !== 2
      ? "idle"
      : board.length === 3
        ? "solved"
        : "computing..."
  const stateActive = pocket.length === 2

  return (
    <section className="explorer-section" id="explorer">
      <div className="explorer-inner">
        <div className="section-header reveal-group">
          <div className="section-label reveal-child">§ 04 · Explorer</div>
          <SplitText as="h2" className="section-title" delay={0.15}>
            Pick a hand. <span className="em">Watch it compute.</span>
          </SplitText>
          <p className="section-sub reveal-child">
            Select two cards for your pocket, then three for the flop. The
            solver reveals equity, cluster membership, and the five nearest
            neighbors in abstraction space.
          </p>
        </div>

        <div className="explorer-layout reveal">
          <div>
            <div className="card-grid-header">
              <span className="card-grid-label">Card Selector</span>
              <span className="card-grid-count">
                <span className="selected">{pocket.length}</span>/2 pocket ·{" "}
                <span className="selected">{board.length}</span>/3 board
              </span>
            </div>

            <div className="card-grid">
              <div className="card-rank-header" />
              {RANKS.map((r) => (
                <div key={r} className="card-rank-header">
                  {r}
                </div>
              ))}
              {SUITS.map((suit) => (
                <Fragment key={suit.name}>
                  <div className={"card-suit-header" + (suit.red ? " red" : "")}>
                    {suit.s}
                  </div>
                  {RANKS.map((r) => {
                    const card = r + suit.name
                    const inPocket = pocket.includes(card)
                    const inBoard = board.includes(card)
                    const selected = inPocket || inBoard
                    const role = inPocket ? "role-pocket" : inBoard ? "role-board" : ""
                    return (
                      <button
                        key={card}
                        className={
                          "card-btn" +
                          (selected ? " selected " + role : "")
                        }
                        onClick={() => toggleCard(card)}
                      >
                        {r}
                        {suit.red ? (
                          <span className="suit-r">{suit.s}</span>
                        ) : (
                          suit.s
                        )}
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>

            <div className="card-controls">
              <div className="card-mode-toggle">
                <button
                  className={"card-mode-btn" + (mode === "pocket" ? " active" : "")}
                  onClick={() => setMode("pocket")}
                >
                  Pocket
                </button>
                <button
                  className={"card-mode-btn" + (mode === "board" ? " active" : "")}
                  onClick={() => setMode("board")}
                >
                  Board
                </button>
              </div>
              <button className="card-reset" onClick={reset}>
                Clear
              </button>
            </div>
          </div>

          <div className="equity-panel">
            <div className="equity-panel-header">
              <span className="equity-panel-label">Live Solve</span>
              <span className={"equity-panel-state" + (stateActive ? " active" : "")}>
                {solveState}
              </span>
            </div>

            <div className={"current-hand" + (pocket.length === 0 ? " empty" : "")}>
              {pocket.length === 0 ? (
                "pocket + flop"
              ) : (
                pocket.map((c, i) => <FormattedCard key={i} card={c} />)
              )}
            </div>
            <div
              className="current-board"
              style={{ opacity: board.length > 0 ? 1 : 0 }}
            >
              {board.length > 0 && (
                <>
                  vs{" "}
                  {board.map((c, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      <FormattedCard card={c} />
                    </span>
                  ))}
                </>
              )}
            </div>

            <div className="equity-display">
              <div
                className={
                  "equity-display-num" + (pocket.length !== 2 ? " empty" : "")
                }
              >
                {pocket.length === 2 ? (
                  <>
                    {equity.toFixed(1)}
                    <span className="unit">%</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="equity-display-label">Win Probability</div>
            </div>

            <div className="equity-stats">
              <div className="equity-stat">
                <div className="k">Cluster</div>
                <div className="v">{cluster}</div>
              </div>
              <div className="equity-stat">
                <div className="k">Distance σ</div>
                <div className="v">{distance}</div>
              </div>
              <div className="equity-stat">
                <div className="k">Population</div>
                <div className="v">{population}</div>
              </div>
              <div className="equity-stat">
                <div className="k">Density</div>
                <div className="v">{density}</div>
              </div>
            </div>

            {neighbors.length > 0 && (
              <div className="neighbors-inline">
                <div className="neighbors-inline-label">Nearest Neighbors</div>
                <div className="neighbors-inline-list">
                  {neighbors.map((n, i) => (
                    <div key={i} className="neighbor-row">
                      <div className="neighbor-rank">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="neighbor-hand">
                        <FormattedCard card={n.hand.slice(0, 2)} />
                        <FormattedCard card={n.hand.slice(2, 4)} />
                      </div>
                      <div className="neighbor-board">
                        <FormattedBoard board={n.board} />
                      </div>
                      <div className="neighbor-equity">
                        {n.equity.toFixed(1)}%
                      </div>
                      <div className="neighbor-distance">
                        Δ {n.distance.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
