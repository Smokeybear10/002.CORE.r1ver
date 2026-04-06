"use client"

import { type ParsedCard, suitSymbol, suitColor, parseObservation } from "@/app/lib/cards"

export function Card({ card }: { card: ParsedCard }) {
  return (
    <span
      className="card-shine inline-flex items-center justify-center select-none transition-transform duration-200 hover:scale-105 hover:-translate-y-0.5"
      style={{
        width: 46,
        height: 64,
        background: "linear-gradient(145deg, #0f0f0f 0%, #080808 100%)",
        border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: 6,
        boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 0 1px rgba(201,168,76,0.2)",
        color: suitColor(card.suit),
        fontFamily: "'Georgia', serif",
        fontSize: 16,
        letterSpacing: 1,
        cursor: "default",
      }}
    >
      <span style={{ fontWeight: 400 }}>{card.rank}</span>
      <span style={{ fontSize: 13, marginLeft: 2 }}>{suitSymbol(card.suit)}</span>
    </span>
  )
}

export function CardGroup({ cards }: { cards: ParsedCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="flex gap-2">
      {cards.map((c, i) => (
        <Card key={i} card={c} />
      ))}
    </div>
  )
}

export function ObservationDisplay({ obs }: { obs: string }) {
  const { pocket, board } = parseObservation(obs)
  return (
    <div className="flex items-center gap-3">
      <CardGroup cards={pocket} />
      {board.length > 0 && (
        <>
          <span style={{
            width: 1, height: 36, margin: "0 8px",
            background: "linear-gradient(180deg, transparent, rgba(201,168,76,0.2), transparent)",
          }} />
          <CardGroup cards={board} />
        </>
      )}
    </div>
  )
}
