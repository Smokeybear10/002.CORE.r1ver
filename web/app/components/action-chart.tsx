"use client"

import type { Decision } from "@/app/lib/api"

const ACTION_LABELS: Record<string, string> = {
  F: "Fold",
  O: "Check",
  "*": "Call",
  "!": "Shove",
}

function actionLabel(edge: string) {
  if (edge in ACTION_LABELS) return ACTION_LABELS[edge]
  return `Raise ${edge}`
}

export function ActionChart({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return null

  const sorted = [...decisions].sort((a, b) => b.mass - a.mass)
  const maxMass = Math.max(...sorted.map((d) => d.mass), 0.001)

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((d, i) => {
        const pct = (d.mass * 100).toFixed(1)
        const w = (d.mass / maxMass) * 100
        const isPassive = d.edge === "F" || d.edge === "O"
        return (
          <div key={d.edge} className={`flex items-center gap-4 animate-fade-up-${i + 1}`}>
            <span className="w-20 text-right truncate" style={{
              color: "rgba(201,168,76,0.35)",
              fontFamily: "'Georgia', serif",
              fontStyle: "italic",
              fontSize: 13,
            }}>
              {actionLabel(d.edge)}
            </span>
            <div className="flex-1 relative" style={{ height: 24, background: "rgba(201,168,76,0.02)" }}>
              <div
                className="animate-bar-grow h-full flex items-center px-3"
                style={{
                  width: `${Math.max(w, 1)}%`,
                  background: isPassive
                    ? "rgba(201,168,76,0.1)"
                    : "linear-gradient(90deg, rgba(201,168,76,0.3), rgba(201,168,76,0.5))",
                  boxShadow: !isPassive ? "0 0 12px rgba(201,168,76,0.08)" : "none",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                {w > 20 && (
                  <span className="font-mono text-xs font-bold" style={{ color: "#050505" }}>
                    {pct}%
                  </span>
                )}
              </div>
            </div>
            {w <= 20 && (
              <span className="font-mono text-xs w-12" style={{ color: "rgba(201,168,76,0.2)" }}>{pct}%</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
