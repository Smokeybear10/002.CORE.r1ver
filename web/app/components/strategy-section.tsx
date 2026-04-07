"use client"

import { useState } from "react"
import { SplitText } from "./split-text"

type Street = {
  name: string
  em: string
  meta: string
  board: React.ReactNode
  pot: string
  facing: string
  actions: { label: string; mass: number }[]
  verdict: string
}

const STREETS: Street[] = [
  {
    name: "Preflop",
    em: "Preflop",
    meta: "STREET 1 · 3-BET POT",
    board: (
      <>
        A♠K<span className="suit-r">♦</span>
      </>
    ),
    pot: "3.5 BB",
    facing: "Open 2.5",
    actions: [
      { label: "Raise 11", mass: 0.62 },
      { label: "Call", mass: 0.24 },
      { label: "Fold", mass: 0.1 },
      { label: "4-Bet", mass: 0.04 },
    ],
    verdict: "Raise 11 BB",
  },
  {
    name: "Flop",
    em: "Flop",
    meta: "STREET 2 · FLOP DECISION",
    board: (
      <>
        7<span className="suit-r">♥</span> 8♣ 2♠
      </>
    ),
    pot: "9.0 BB",
    facing: "Check",
    actions: [
      { label: "Raise 12", mass: 0.42 },
      { label: "Call", mass: 0.32 },
      { label: "Raise 6", mass: 0.17 },
      { label: "Fold", mass: 0.06 },
      { label: "Shove", mass: 0.03 },
    ],
    verdict: "Raise 12 BB",
  },
  {
    name: "Turn",
    em: "Turn",
    meta: "STREET 3 · TURN",
    board: (
      <>
        7<span className="suit-r">♥</span> 8♣ 2♠ · T<span className="suit-r">♦</span>
      </>
    ),
    pot: "33.0 BB",
    facing: "Check",
    actions: [
      { label: "Bet 22", mass: 0.48 },
      { label: "Check", mass: 0.38 },
      { label: "Bet 11", mass: 0.1 },
      { label: "Shove", mass: 0.04 },
    ],
    verdict: "Bet 22 BB",
  },
  {
    name: "River",
    em: "River",
    meta: "STREET 4 · SHOWDOWN",
    board: (
      <>
        7<span className="suit-r">♥</span> 8♣ 2♠ T<span className="suit-r">♦</span> · A♣
      </>
    ),
    pot: "77.0 BB",
    facing: "Check",
    actions: [
      { label: "Bet 40", mass: 0.55 },
      { label: "Check", mass: 0.28 },
      { label: "Shove", mass: 0.14 },
      { label: "Bet 20", mass: 0.03 },
    ],
    verdict: "Bet 40 BB",
  },
]

const STREET_BOARDS: React.ReactNode[] = [
  <>A♠K<span key="d" className="suit-r">♦</span></>,
  <>7<span key="h" className="suit-r">♥</span> 8♣ 2♠</>,
  "—",
  "—",
]
const STREET_LABELS = ["3-bet pot · BB vs BTN", "· decision point ·", "pending", "pending"]

export function StrategySection() {
  const [active, setActive] = useState(1)
  const street = STREETS[active]
  const sorted = [...street.actions].sort((a, b) => b.mass - a.mass)

  return (
    <section className="strategy-section" id="strategy">
      <div className="strategy-inner">
        <div className="section-header reveal-group">
          <div className="section-label reveal-child">§ 05 · Strategy</div>
          <SplitText as="h2" className="section-title" delay={0.15}>
            The solver&apos;s <span className="em">blueprint.</span>
          </SplitText>
          <p className="section-sub reveal-child">
            Move through the streets. See the GTO action distribution for each
            decision point. This is not a recommendation. This is equilibrium.
          </p>
        </div>

        <div className="strategy-layout reveal">
          <div className="timeline">
            {STREETS.map((s, i) => {
              const cls =
                "timeline-street" +
                (i === active ? " active" : i < active ? " past" : "")
              return (
                <div key={i} className={cls} onClick={() => setActive(i)}>
                  <div className="street-name">{s.name}</div>
                  <div className="street-label">
                    {i === active ? "· decision point ·" : STREET_LABELS[i]}
                  </div>
                  <div className="street-board">{STREET_BOARDS[i]}</div>
                </div>
              )
            })}
          </div>

          <div className="strategy-panel">
            <div className="strategy-panel-header">
              <h3 className="strategy-panel-title">
                <span className="em">{street.em}</span> decision
              </h3>
              <span className="strategy-panel-meta">{street.meta}</span>
            </div>

            <div className="strategy-situation">
              <div className="item">
                <div className="k">Board</div>
                <div className="v">{street.board}</div>
              </div>
              <div className="item">
                <div className="k">Pot</div>
                <div className="v">{street.pot}</div>
              </div>
              <div className="item">
                <div className="k">Facing</div>
                <div className="v">{street.facing}</div>
              </div>
            </div>

            <div className="action-list">
              {sorted.map((a, i) => (
                <div key={a.label} className="action-row">
                  <div className={"action-label" + (i === 0 ? " primary" : "")}>
                    {a.label}
                  </div>
                  <div className="action-bar-wrap">
                    <div
                      className={"action-bar-fill" + (i === 0 ? " primary" : "")}
                      style={{ width: `${a.mass * 100}%` }}
                    />
                  </div>
                  <div className="action-mass">
                    {Math.round(a.mass * 100)}%
                  </div>
                </div>
              ))}
            </div>

            <div className="verdict-block">
              <span className="label">Top EV · Verdict</span>
              <span className="action">{street.verdict}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
