export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1" style={{ textAlign: "center" }}>
      <span style={{ color: "rgba(201,168,76,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>{label}</span>
      <span className="text-lg font-mono" style={{ color: "#c9a84c" }}>{value}</span>
      {sub && <span style={{ color: "rgba(201,168,76,0.2)", fontSize: 12 }}>{sub}</span>}
    </div>
  )
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between">{children}</div>
}
