export type ParsedCard = {
  rank: string
  suit: "c" | "d" | "h" | "s"
}

const SUIT_SYMBOLS: Record<string, string> = {
  c: "\u2663",
  d: "\u2666",
  h: "\u2665",
  s: "\u2660",
}

const SUIT_COLORS: Record<string, string> = {
  c: "#c9a84c",
  d: "#c9a84c",
  h: "#c9a84c",
  s: "rgba(201,168,76,0.6)",
}

// The published dataset is shortdeck (36 cards, sixes and up). Ranks 2-5 parse as
// perfectly valid cards but name hands the solver has never seen, so reject them here
// rather than let the query come back empty.
export const RANKS = "6789TJQKA"

export function parseCard(s: string): ParsedCard | null {
  const clean = s.trim()
  if (clean.length !== 2) return null
  const rank = clean[0].toUpperCase()
  const suit = clean[1].toLowerCase()
  if (!RANKS.includes(rank)) return null
  if (!"cdhs".includes(suit)) return null
  return { rank, suit: suit as ParsedCard["suit"] }
}

export function parseObservation(obs: string): { pocket: ParsedCard[]; board: ParsedCard[] } {
  const clean = obs.replace(/\s/g, "")
  const [pocketStr, boardStr] = clean.split("~")
  const pocket = chunkCards(pocketStr ?? "")
  const board = chunkCards(boardStr ?? "")
  return { pocket, board }
}

function chunkCards(s: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  for (let i = 0; i < s.length; i += 2) {
    const c = parseCard(s.slice(i, i + 2))
    if (c) cards.push(c)
  }
  return cards
}

export function suitSymbol(suit: string) {
  return SUIT_SYMBOLS[suit] ?? suit
}

export function suitColor(suit: string) {
  return SUIT_COLORS[suit] ?? "#c9a84c"
}

export function isRedSuit(suit: string) {
  return suit === "h" || suit === "d"
}

export function streetName(code: string): string {
  const c = code.toUpperCase().charAt(0)
  return { P: "Preflop", F: "Flop", T: "Turn", R: "River" }[c] ?? code
}

export function streetFromAbs(abs: string): string {
  return abs.split("::")[0] ?? ""
}

// How many suit-isomorphic hands exist on each street, for the short deck the published
// dataset was trained on. `density` is a cluster's share of this space, so it's what turns
// a density back into a hand count.
const N_ISOMORPHISMS: Record<string, number> = {
  P: 81,
  F: 186_696,
  T: 1_340_856,
  R: 7_723_728,
}

export function clusterPopulation(abs: string, density: number): number {
  return Math.round(density * (N_ISOMORPHISMS[streetFromAbs(abs)] ?? 0))
}
