export type ScrollState = {
  page: number       // 0-1 overall page progress
  hero: number       // 0-1 within hero section
  heroPhase: 1 | 2 | 3
  chapter2: number   // 0-1
  chapter3: number   // 0-1
  section: number    // 1-5
}

type Listener = (state: ScrollState) => void

const state: ScrollState = {
  page: 0,
  hero: 0,
  heroPhase: 1,
  chapter2: 0,
  chapter3: 0,
  section: 1,
}

const listeners = new Set<Listener>()

export const scrollStore = {
  getState: () => state,
  setState: (patch: Partial<ScrollState>) => {
    Object.assign(state, patch)
    listeners.forEach((fn) => fn(state))
  },
  subscribe: (fn: Listener) => {
    listeners.add(fn)
    fn(state)
    return () => {
      listeners.delete(fn)
    }
  },
}
