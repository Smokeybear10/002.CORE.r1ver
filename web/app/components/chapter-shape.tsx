"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

const LINE_POINTS =
  "0,172 20,168 40,160 60,148 80,130 100,108 120,82 140,52 160,28 180,12 200,8 220,24 232,18 244,14 260,28 280,54 300,82 320,112 340,140 360,158 380,170 400,176"
const AREA_POINTS = "0,180 " + LINE_POINTS + " 400,180"

export function ChapterShape() {
  const lineRef = useRef<SVGPolylineElement>(null)
  const areaRef = useRef<SVGPolygonElement>(null)
  const markerRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  useEffect(() => {
    const unsub = scrollStore.subscribe((s) => {
      const c2 = s.chapter2
      const drawT = Math.max(0, Math.min(1, c2 / 0.5))
      if (lineRef.current) {
        lineRef.current.setAttribute(
          "stroke-dashoffset",
          String(1200 * (1 - drawT))
        )
      }
      if (areaRef.current) {
        areaRef.current.style.opacity = String(
          Math.max(0, Math.min(1, (c2 - 0.3) / 0.3))
        )
      }
      const markerT = Math.max(0, Math.min(1, (c2 - 0.5) / 0.2))
      if (markerRef.current) markerRef.current.setAttribute("opacity", String(markerT * 0.4))
      if (dotRef.current) dotRef.current.setAttribute("opacity", String(markerT))
      if (textRef.current) textRef.current.setAttribute("opacity", String(markerT * 0.8))
    })
    return unsub
  }, [])

  return (
    <section className="chapter-scroll" id="chapter-2">
      <div className="chapter-sticky">
        <div className="chapter-inner">
          <div className="reveal-group">
            <div className="chapter-label reveal-child">
              <span className="num">§ 02</span>
              <span className="line" />
              <span>The Shape of Equity</span>
            </div>
            <h2 className="chapter-heading reveal-child">
              A cluster is <span className="em">not a number.</span>
              <br />
              It is a <span className="em">shape.</span>
            </h2>
            <p className="chapter-body reveal-child">
              Eighteen hundred observations share this hand&apos;s equity
              distribution. Most hover near the median. A thin left tail punishes
              the unfortunate runouts; a fat right tail rewards the dominant
              ones. The solver sees the whole curve, not the average.
            </p>
          </div>
          <div className="distribution reveal">
            <svg className="dist-svg" viewBox="0 0 400 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dist-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="60" x2="400" y2="60" stroke="#c9a84c" strokeWidth="1" strokeDasharray="2,4" opacity="0.2" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="#c9a84c" strokeWidth="1" strokeDasharray="2,4" opacity="0.2" />
              <polygon ref={areaRef} points={AREA_POINTS} fill="url(#dist-fill)" style={{ opacity: 0 }} />
              <polyline
                ref={lineRef}
                points={LINE_POINTS}
                fill="none"
                stroke="#c9a84c"
                strokeWidth="1.5"
                strokeDasharray="1200"
                strokeDashoffset="1200"
              />
              <line ref={markerRef} x1="233" y1="0" x2="233" y2="180" stroke="#ffffff" strokeWidth="1" strokeDasharray="2,3" opacity="0" />
              <circle ref={dotRef} cx="233" cy="18" r="4" fill="#c9a84c" opacity="0" />
              <text ref={textRef} x="233" y="-6" fill="#ffffff" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" opacity="0" dy="14">
                AK · 58.3%
              </text>
            </svg>
            <div className="dist-axis">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <div className="dist-meta">
              <div className="dist-meta-cell">
                <div className="k">Median</div>
                <div className="v">54.2%</div>
              </div>
              <div className="dist-meta-cell">
                <div className="k">Your hand</div>
                <div className="v">58.3%</div>
              </div>
              <div className="dist-meta-cell">
                <div className="k">Peak</div>
                <div className="v">72.1%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
