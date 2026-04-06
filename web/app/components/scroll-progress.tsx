"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

const LABELS = ["hero", "shape", "space", "explorer", "strategy"]

export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const unsub = scrollStore.subscribe((s) => {
      if (fillRef.current) fillRef.current.style.height = `${s.page * 100}%`
      markerRefs.current.forEach((m, i) => {
        if (!m) return
        m.classList.toggle("active", i + 1 === s.section)
      })
      labelRefs.current.forEach((l, i) => {
        if (!l) return
        l.classList.toggle("active", i + 1 === s.section)
      })
    })
    return unsub
  }, [])

  return (
    <div className="scroll-progress">
      <div className="fill" ref={fillRef} />
      <div className="markers">
        {LABELS.map((_, i) => {
          const y = (i / (LABELS.length - 1)) * 100
          return (
            <div
              key={i}
              ref={(el) => {
                markerRefs.current[i] = el
              }}
              className={"marker" + (i === 0 ? " active" : "")}
              style={{ top: `${y}%` }}
            />
          )
        })}
      </div>
      {LABELS.map((label, i) => {
        const y = (i / (LABELS.length - 1)) * 100
        return (
          <div
            key={label}
            ref={(el) => {
              labelRefs.current[i] = el
            }}
            className={"label" + (i === 0 ? " active" : "")}
            style={{ top: `${y}%` }}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}
