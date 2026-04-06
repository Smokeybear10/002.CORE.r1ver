"use client"

import type { Sample } from "@/app/lib/api"
import { ObservationDisplay } from "./card"

export function SampleRow({
  sample,
  showDistance,
  onClick,
}: {
  sample: Sample
  showDistance?: boolean
  onClick?: () => void
}) {
  const equity = (sample.equity * 100).toFixed(1)
  const density = (sample.density * 100).toFixed(2)

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex items-center gap-4 px-5 py-4 w-full text-left group transition-all duration-300"
      style={{
        borderBottom: "1px solid rgba(201,168,76,0.04)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(201,168,76,0.02)"
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent"
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.04)"
      }}
    >
      <ObservationDisplay obs={sample.obs} />
      <div className="flex gap-8 ml-auto text-sm font-mono tabular-nums">
        <div className="flex flex-col items-end gap-0.5">
          <span style={{ color: "rgba(201,168,76,0.12)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>cluster</span>
          <span style={{ color: "rgba(201,168,76,0.3)" }}>{sample.abs}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span style={{ color: "rgba(201,168,76,0.12)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>equity</span>
          <span style={{ color: "#c9a84c" }}>{equity}%</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span style={{ color: "rgba(201,168,76,0.12)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>density</span>
          <span style={{ color: "rgba(201,168,76,0.2)" }}>{density}%</span>
        </div>
        {showDistance && (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ color: "rgba(201,168,76,0.12)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>distance</span>
            <span style={{ color: "rgba(201,168,76,0.2)" }}>{sample.distance.toFixed(4)}</span>
          </div>
        )}
      </div>
    </button>
  )
}
