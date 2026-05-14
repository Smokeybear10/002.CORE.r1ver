"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

export function HeroSection() {
  const phase1Ref = useRef<HTMLDivElement>(null)
  const phase2Ref = useRef<HTMLDivElement>(null)
  const phase3Ref = useRef<HTMLDivElement>(null)
  const equityRef = useRef<HTMLSpanElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = scrollStore.subscribe((s) => {
      const h = s.hero
      const p1 = phase1Ref.current
      const p2 = phase2Ref.current
      const p3 = phase3Ref.current
      if (!p1 || !p2 || !p3) return

      p1.style.opacity = h < 0.2 ? "1" : String(Math.max(0, 1 - (h - 0.2) * 10))

      let p2op = 0
      if (h < 0.2) p2op = 0
      else if (h < 0.3) p2op = (h - 0.2) * 10
      else if (h < 0.7) p2op = 1
      else if (h < 0.75) p2op = 1 - (h - 0.7) * 20
      else p2op = 0
      p2.style.opacity = String(p2op)

      let p3op = 0
      if (h < 0.7) p3op = 0
      else if (h < 0.75) p3op = (h - 0.7) * 20
      else p3op = 1
      p3.style.opacity = String(p3op)

      if (equityRef.current) {
        if (h > 0.7) {
          const t = Math.min(1, (h - 0.7) / 0.05)
          const eased = t * (2 - t)
          equityRef.current.textContent = (eased * 58.3).toFixed(1)
        } else {
          equityRef.current.textContent = "0.0"
        }
      }

      if (hintRef.current) {
        hintRef.current.style.opacity =
          h < 0.1 ? "1" : String(Math.max(0, 1 - h * 3))
      }
    })
    return unsub
  }, [])

  return (
    <section className="hero-scroll" id="hero">
      <div className="hero-sticky">
        <div className="hero-content">
          <div className="hero-phase" ref={phase1Ref}>
            <div className="hero-eyebrow hero-enter hero-enter-1">R1VER | a solver you can watch think</div>
            <h1 className="hero-title hero-enter hero-enter-2">
              The river
              <br />
              is <span className="em">computed.</span>
            </h1>
            <p className="hero-subtitle hero-enter hero-enter-3">
              Every hand, every street, every decision. Two thousand clusters, one
              hundred thousand rollouts, the entire game in abstraction space.
            </p>
          </div>
          <div className="hero-phase" ref={phase2Ref} style={{ opacity: 0 }}>
            <div className="hero-eyebrow">R1VER | case 0047 · flop</div>
            <div className="hero-hand">
              A<span className="suit-r">♠</span>K<span className="suit-r">♦</span>
            </div>
            <div className="hero-hand-meta">VS</div>
            <div className="hero-board">
              7<span className="suit-r">♥</span> 8♣ 2♠
            </div>
          </div>
          <div className="hero-phase" ref={phase3Ref} style={{ opacity: 0 }}>
            <div className="hero-eyebrow">R1VER | the verdict</div>
            <div className="hero-equity">
              <span ref={equityRef}>0.0</span>
              <span className="unit">%</span>
            </div>
            <div className="hero-equity-label">
              Win Probability · 100,000 Runouts
            </div>
          </div>
        </div>
        <div className="hero-scroll-hint" ref={hintRef}>
          scroll to observe
        </div>
      </div>
    </section>
  )
}
