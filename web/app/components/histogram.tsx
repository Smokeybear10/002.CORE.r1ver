"use client"

import type { Sample } from "@/app/lib/api"

export function Histogram({ data, label }: { data: Sample[]; label?: string }) {
  if (data.length === 0) return null

  const maxDensity = Math.max(...data.map((d) => d.density), 0.001)
  const sorted = [...data].sort((a, b) => a.equity - b.equity)

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <span style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <div className="flex items-end gap-px h-36 relative">
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <div key={p} style={{
            position: "absolute", left: 0, right: 0, bottom: `${p * 100}%`,
            height: 1, background: "rgba(201,168,76,0.03)",
          }} />
        ))}
        {sorted.map((d, i) => {
          const h = (d.density / maxDensity) * 100
          const opacity = d.equity < 0.33 ? 0.12 : d.equity < 0.66 ? 0.3 : 0.7
          return (
            <div
              key={i}
              className="flex-1 min-w-1 group relative transition-all duration-200 hover:brightness-150"
              style={{
                height: `${Math.max(h, 2)}%`,
                backgroundColor: `rgba(201,168,76,${opacity})`,
                borderRadius: "1px 1px 0 0",
                animationDelay: `${i * 15}ms`,
                boxShadow: d.equity > 0.66 ? "0 -2px 8px rgba(201,168,76,0.15)" : "none",
              }}
            >
              <div
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block rounded px-3 py-2 text-xs whitespace-nowrap z-10"
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(201,168,76,0.15)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <div className="font-mono" style={{ color: "#c9a84c", marginBottom: 2 }}>{d.abs}</div>
                <div style={{ color: "rgba(201,168,76,0.5)" }}>
                  equity {(d.equity * 100).toFixed(1)}% · density {(d.density * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between font-mono" style={{ color: "rgba(201,168,76,0.12)", fontSize: 9, letterSpacing: 1 }}>
        <span>0%</span>
        <span>EQUITY</span>
        <span>100%</span>
      </div>
    </div>
  )
}
