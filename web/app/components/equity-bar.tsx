"use client"

export function EquityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex-1 relative" style={{ height: 3, background: "rgba(201,168,76,0.04)" }}>
        <div
          className="animate-bar-grow"
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, rgba(201,168,76,0.3), #c9a84c)",
            boxShadow: "0 0 12px rgba(201,168,76,0.3), 0 0 4px rgba(201,168,76,0.5)",
          }}
        />
        {/* Tick mark at end */}
        <div style={{
          position: "absolute", top: -4, left: `${pct}%`,
          width: 1, height: 11,
          background: "#c9a84c",
          boxShadow: "0 0 6px rgba(201,168,76,0.5)",
          transform: "translateX(-0.5px)",
        }} />
      </div>
      <span className="font-mono text-sm tabular-nums" style={{ color: "#c9a84c", minWidth: 48, textAlign: "right" }}>{pct}%</span>
    </div>
  )
}
