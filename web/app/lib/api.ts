const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"

// The solver API is a self-hosted Rust binary, not part of the Vercel deploy. When it
// isn't reachable the browser throws an opaque TypeError, so name the cause instead.
const OFFLINE_MESSAGE =
  "Solver API unreachable. The Rust backend runs separately from this frontend — " +
  "see the README to run it locally, or explore the write-up in the meantime."

// The API is hosted on a free tier that suspends the container after ~15 minutes idle, so
// the first request after a lull pays a cold start. Without a deadline that arrives as a
// spinner that never resolves; with one, a retry covers the wake-up and only a second
// failure is reported. A warm request answers in ~20ms, so this never fires in normal use.
const TIMEOUT_MS = 45_000

async function attempt(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await attempt(path, body)
    // a 502/503 from the platform's router means the container is still booting, not that
    // the request was wrong — the same case as a timeout, so retry it the same way
    if (res.status >= 502 && res.status <= 504) throw new Error("cold")
  } catch {
    try {
      res = await attempt(path, body)
    } catch {
      throw new Error(OFFLINE_MESSAGE)
    }
    if (res.status >= 502 && res.status <= 504) throw new Error(OFFLINE_MESSAGE)
  }
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
