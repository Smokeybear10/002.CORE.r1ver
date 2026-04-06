"use client"

import { useState } from "react"
import { suitSymbol } from "@/app/lib/cards"

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]
const SUITS = ["s", "h", "d", "c"] as const

type PickerCard = { rank: string; suit: string }

function cardKey(c: PickerCard) {
  return `${c.rank}${c.suit}`
}

function toObs(pocket: PickerCard[], board: PickerCard[]): string {
  const p = pocket.map(cardKey).join("")
  const b = board.map(cardKey).join("")
  return b ? `${p}~${b}` : p
}

function MiniCard({ card, empty, onClick }: { card?: PickerCard; empty?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 40, height: 56, borderRadius: 5,
        border: `1px solid ${card ? "rgba(201,168,76,0.25)" : "rgba(201,168,76,0.05)"}`,
        background: card
          ? "linear-gradient(145deg, #0f0f0f 0%, #080808 100%)"
          : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Georgia', serif", fontSize: 15,
        color: "#c9a84c", transition: "all 0.2s",
        cursor: card ? "pointer" : "default",
        boxShadow: card ? "0 4px 16px rgba(0,0,0,0.4)" : "none",
      }}
    >
      {card ? (
        <span>{card.rank}<span style={{ fontSize: 12, marginLeft: 1, opacity: 0.7 }}>{suitSymbol(card.suit)}</span></span>
      ) : empty ? (
        <span style={{ color: "rgba(201,168,76,0.06)", fontSize: 20, fontWeight: 300 }}>+</span>
      ) : null}
    </div>
  )
}

export function CardPicker({
  onSelect,
}: {
  onSelect: (obs: string) => void
}) {
  const [pocket, setPocket] = useState<PickerCard[]>([])
  const [board, setBoard] = useState<PickerCard[]>([])

  const selected = new Set([...pocket, ...board].map(cardKey))

  function toggle(rank: string, suit: string) {
    const key = cardKey({ rank, suit })
    if (selected.has(key)) {
      setPocket(p => p.filter(c => cardKey(c) !== key))
      setBoard(b => b.filter(c => cardKey(c) !== key))
      return
    }
    if (pocket.length < 2) {
      const next = [...pocket, { rank, suit }]
      setPocket(next)
    } else if (board.length < 5) {
      const next = [...board, { rank, suit }]
      setBoard(next)
    }
  }

  function clear() {
    setPocket([])
    setBoard([])
  }

  const canExplore = pocket.length === 2
  const showBoard = pocket.length === 2

  return (
    <div>
      {/* Selected cards + actions */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, minHeight: 72, marginBottom: 24,
      }}>
        <MiniCard card={pocket[0]} empty={pocket.length === 0} onClick={pocket[0] ? () => toggle(pocket[0].rank, pocket[0].suit) : undefined} />
        <MiniCard card={pocket[1]} empty={pocket.length === 1} onClick={pocket[1] ? () => toggle(pocket[1].rank, pocket[1].suit) : undefined} />

        {showBoard && (
          <>
            <div style={{
              width: 1, height: 36, margin: "0 8px",
              background: "linear-gradient(180deg, transparent, rgba(201,168,76,0.12), transparent)",
            }} />
            {Array.from({ length: Math.max(board.length + (board.length < 5 ? 1 : 0), 3) }, (_, i) => (
              <MiniCard
                key={i}
                card={board[i]}
                empty={i <= board.length && i < 5}
                onClick={board[i] ? () => toggle(board[i].rank, board[i].suit) : undefined}
              />
            ))}
          </>
        )}
      </div>

      {/* Card grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `24px repeat(${RANKS.length}, 1fr)`,
        gap: 3,
      }}>
        {SUITS.map(suit => (
          <div key={suit} style={{ display: "contents" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "rgba(201,168,76,0.3)",
            }}>
              {suitSymbol(suit)}
            </div>

            {RANKS.map(rank => {
              const key = cardKey({ rank, suit })
              const isSel = selected.has(key)
              const isPocket = pocket.some(c => cardKey(c) === key)
              const isFull = !isSel && pocket.length >= 2 && board.length >= 5
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !isFull && toggle(rank, suit)}
                  style={{
                    height: 34, borderRadius: 3,
                    border: `1px solid ${isSel ? "rgba(201,168,76,0.35)" : "rgba(201,168,76,0.04)"}`,
                    background: isSel
                      ? isPocket
                        ? "linear-gradient(145deg, rgba(201,168,76,0.14), rgba(201,168,76,0.08))"
                        : "rgba(201,168,76,0.06)"
                      : "transparent",
                    color: isSel ? "#c9a84c" : isFull ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.38)",
                    fontSize: 12, fontFamily: "'Georgia', serif",
                    cursor: isFull ? "default" : "pointer",
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isSel ? "0 0 8px rgba(201,168,76,0.06)" : "none",
                  }}
                  onMouseEnter={e => {
                    if (!isSel && !isFull) {
                      e.currentTarget.style.background = "rgba(201,168,76,0.03)"
                      e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)"
                      e.currentTarget.style.color = "rgba(201,168,76,0.4)"
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel && !isFull) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.borderColor = "rgba(201,168,76,0.04)"
                      e.currentTarget.style.color = "rgba(201,168,76,0.38)"
                    }
                  }}
                >
                  {rank}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom row: hint + actions */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 16,
      }}>
        <span className="font-mono" style={{ color: "rgba(201,168,76,0.22)", fontSize: 10, letterSpacing: 1 }}>
          {pocket.length < 2 ? "Select 2 hole cards" : board.length === 0 ? "Add board cards or explore preflop" : board.length < 5 ? `${board.length} board card${board.length > 1 ? "s" : ""}` : "Board complete"}
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={clear}
              className="font-mono"
              style={{
                color: "rgba(201,168,76,0.12)", fontSize: 10, letterSpacing: 1,
                background: "none", border: "none", cursor: "pointer", padding: "6px 8px",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(201,168,76,0.3)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(201,168,76,0.12)"}
            >
              clear
            </button>
          )}
          {canExplore && (
            <button
              type="button"
              onClick={() => onSelect(toObs(pocket, board))}
              className="font-mono"
              style={{
                padding: "7px 20px", fontSize: 10, letterSpacing: 3,
                textTransform: "uppercase", color: "#c9a84c",
                border: "1px solid rgba(201,168,76,0.25)",
                background: "rgba(201,168,76,0.04)",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(201,168,76,0.08)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.04)"; e.currentTarget.style.boxShadow = "none" }}
            >
              Explore
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
