"use client"

import { ObservationDisplay } from "@/app/components/card"
import { EquityBar } from "@/app/components/equity-bar"
import { Stat, StatRow } from "@/app/components/stat"
import { Histogram } from "@/app/components/histogram"
import { ActionChart } from "@/app/components/action-chart"
import { SampleRow } from "@/app/components/sample-row"
import type { Sample, Decision } from "@/app/lib/api"

const SAMPLE: Sample = { obs: "AsKd~7h8c2s", abs: "F::3a", equity: 0.72, density: 0.0134, distance: 0 }

const NEIGHBORS: Sample[] = [
  { obs: "AhKs~7h8c2s", abs: "F::3a", equity: 0.71, density: 0.0128, distance: 0.0023 },
  { obs: "AcKh~7d8s2c", abs: "F::3b", equity: 0.69, density: 0.0115, distance: 0.0089 },
  { obs: "AdKc~7s8h2d", abs: "F::3c", equity: 0.68, density: 0.0142, distance: 0.0134 },
]

const HISTOGRAM: Sample[] = Array.from({ length: 36 }, (_, i) => ({
  obs: "",
  abs: `F::${i.toString(16)}`,
  equity: i / 35,
  density: Math.random() * 0.05 + (i > 12 && i < 24 ? 0.04 : 0.01),
  distance: 0,
}))

const DECISIONS: Decision[] = [
  { edge: "*", mass: 0.35 },
  { edge: "3/5", mass: 0.28 },
  { edge: "!", mass: 0.17 },
  { edge: "F", mass: 0.12 },
  { edge: "O", mass: 0.08 },
]

function Divider() {
  return (
    <div style={{
      height: 1, margin: "32px 0",
      background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent)",
    }} />
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: "rgba(201,168,76,0.2)", fontSize: 10, letterSpacing: 4,
      textTransform: "uppercase", marginBottom: 20,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span>{children}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.06)" }} />
    </div>
  )
}

const HANDS = [
  "AsAh", "KsKd", "QhQc", "AhKs~9d4c2h",
  "7s7d~Tc8h3s", "9h8h~7d6s2c", "AdQs~JhTc4d",
]

export default function DemoPage() {
  return (
    <div className="max-w-[920px] mx-auto px-10 py-14">
      {/* Hero */}
      <div className="mb-16 animate-fade-up">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 36, fontWeight: 400, letterSpacing: 1 }}>Design Preview</h1>
          <span className="font-mono" style={{ color: "rgba(201,168,76,0.15)", fontSize: 11, letterSpacing: 2 }}>OBSIDIAN</span>
        </div>
        <p style={{ color: "rgba(201,168,76,0.25)", fontSize: 14, fontStyle: "italic" }}>
          All components rendered with sample data
        </p>
      </div>

      {/* Card showcase */}
      <SectionLabel>Card Faces</SectionLabel>
      <div className="flex flex-col gap-5 mb-4 animate-fade-up-1">
        {HANDS.map((h) => (
          <div key={h} className="flex items-center gap-6">
            <ObservationDisplay obs={h} />
            <span className="font-mono text-xs" style={{ color: "rgba(201,168,76,0.15)" }}>{h}</span>
          </div>
        ))}
      </div>

      <Divider />

      {/* Analysis panel */}
      <div className="animate-fade-up-2">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "32px 0", marginBottom: 8,
        }}>
          <ObservationDisplay obs={SAMPLE.obs} />
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 56, fontWeight: 400, fontFamily: "'Georgia', serif",
              letterSpacing: 2, lineHeight: 1,
            }}>
              72<span style={{ fontSize: 28, color: "rgba(201,168,76,0.4)" }}>.0%</span>
            </div>
            <div style={{ color: "rgba(201,168,76,0.15)", fontSize: 9, letterSpacing: 3, marginTop: 4, textTransform: "uppercase" }}>
              Hand Equity
            </div>
          </div>
        </div>

        <EquityBar value={0.72} />

        <Divider />

        <StatRow>
          <Stat label="Cluster" value="F::3a" sub="Flop" />
          <Stat label="Equity" value="72.0%" />
          <Stat label="Density" value="1.34%" sub="of observation space" />
        </StatRow>
      </div>

      <Divider />

      {/* Equity spectrum */}
      <SectionLabel>Equity Spectrum</SectionLabel>
      <div className="flex flex-col gap-4 max-w-lg animate-fade-up-3">
        {[0.92, 0.72, 0.55, 0.40, 0.25, 0.10].map((v) => (
          <EquityBar key={v} value={v} />
        ))}
      </div>

      <Divider />

      {/* Histogram */}
      <div className="animate-fade-up-4">
        <Histogram data={HISTOGRAM} label="Equity Distribution" />
      </div>

      <Divider />

      {/* Strategy */}
      <SectionLabel>Optimal Strategy</SectionLabel>
      <div className="animate-fade-up-5">
        <ActionChart decisions={DECISIONS} />
      </div>

      <Divider />

      {/* Neighbors */}
      <SectionLabel>Similar Hands</SectionLabel>
      <div>
        {NEIGHBORS.map((s, i) => (
          <SampleRow key={i} sample={s} showDistance />
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 64, textAlign: "center", paddingBottom: 32 }}>
        <div style={{
          display: "inline-block", padding: "12px 32px",
          border: "1px solid rgba(201,168,76,0.06)",
          color: "rgba(201,168,76,0.12)", fontSize: 10, letterSpacing: 6,
          fontFamily: "var(--font-geist-mono), monospace",
        }}>
          R1VER
        </div>
      </div>
    </div>
  )
}
