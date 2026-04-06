"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

const fmt = (n: number) => n.toLocaleString("en-US")
const SECTION_LABELS = ["§ 01", "§ 02", "§ 03", "§ 04", "§ 05"]

export function Telemetry() {
  const rolloutsRef = useRef<HTMLSpanElement>(null)
  const opsRef = useRef<HTMLSpanElement>(null)
  const sectionRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let rollouts = 0
    const interval = window.setInterval(() => {
      const ops = 2400000 + Math.floor(Math.random() * 800000)
      rollouts = (rollouts + Math.floor(ops / 20)) % 999999999
      if (rolloutsRef.current) rolloutsRef.current.textContent = fmt(rollouts)
      if (opsRef.current) opsRef.current.textContent = fmt(ops)
    }, 80)

    const unsub = scrollStore.subscribe((s) => {
      if (sectionRef.current) {
        sectionRef.current.textContent = SECTION_LABELS[s.section - 1] ?? "§ 01"
      }
    })

    return () => {
      window.clearInterval(interval)
      unsub()
    }
  }, [])

  return (
    <div className="telemetry">
      <div className="row">
        <span className="k">rollouts</span>
        <span className="v" ref={rolloutsRef}>0</span>
      </div>
      <div className="row">
        <span className="k">obs/sec</span>
        <span className="v" ref={opsRef}>0</span>
      </div>
      <div className="row">
        <span className="k">section</span>
        <span className="v" ref={sectionRef}>§ 01</span>
      </div>
    </div>
  )
}
