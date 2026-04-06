const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json()
}

// Response types matching Rust backend
export type Sample = {
  obs: string
  abs: string
  equity: number
  density: number
  distance: number
}

export type Decision = {
  edge: string
  mass: number
}

// Explorer endpoints
export const api = {
  exploreStreet: (street: string) =>
    post<Sample>("/exp-wrt-str", { street }),

  exploreObs: (obs: string) =>
    post<Sample>("/exp-wrt-obs", { obs }),

  exploreAbs: (wrt: string) =>
    post<Sample>("/exp-wrt-abs", { wrt }),

  replaceObs: (obs: string) =>
    post<string>("/replace-obs", { obs }),

  // Neighbor endpoints
  neighborRandom: (wrt: string) =>
    post<Sample>("/nbr-any-abs", { wrt }),

  neighborObs: (wrt: string, obs: string) =>
    post<Sample>("/nbr-obs-abs", { wrt, obs }),

  neighborAbs: (wrt: string, abs: string) =>
    post<Sample>("/nbr-abs-abs", { wrt, abs }),

  nearestNeighbors: (wrt: string) =>
    post<Sample[]>("/nbr-knn-abs", { wrt }),

  farthestNeighbors: (wrt: string) =>
    post<Sample[]>("/nbr-kfn-abs", { wrt }),

  givenNeighbors: (wrt: string, neighbors: string[]) =>
    post<Sample[]>("/nbr-kgn-abs", { wrt, neighbors }),

  // Histogram endpoints
  histogramAbs: (abs: string) =>
    post<Sample[]>("/hst-wrt-abs", { abs }),

  histogramObs: (obs: string) =>
    post<Sample[]>("/hst-wrt-obs", { obs }),

  // Blueprint / strategy
  blueprint: (turn: string, seen: string, past: string[]) =>
    post<Decision[]>("/blueprint", { turn, seen, past }),
}
