"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

type Cluster = {
  x: number
  y: number
  size: number
  opacity: number
}

const YOUR_IDX = 1247
const N = 2000

export function ClusterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let W = canvas.offsetWidth
    let H = canvas.offsetHeight
    let dpr = window.devicePixelRatio || 1

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const clusters: Cluster[] = []
    for (let i = 0; i < N; i++) {
      const angle = (i * 137.5) * (Math.PI / 180)
      const r = Math.sqrt(i / N) * 0.44
      const jitter = Math.sin(i * 31.3) * 0.02
      clusters.push({
        x: 0.5 + (r + jitter) * Math.cos(angle),
        y: 0.5 + (r + jitter) * Math.sin(angle),
        size: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.3 + 0.1,
      })
    }
    const your = clusters[YOUR_IDX]

    let t = 0
    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const reveal = scrollStore.getState().chapter3

      ctx.beginPath()
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.48, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(201, 168, 76, 0.08)"
      ctx.lineWidth = 1
      ctx.stroke()

      for (const r of [0.3, 0.15]) {
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, Math.min(W, H) * r, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(201, 168, 76, 0.04)"
        ctx.setLineDash([1, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      const visibleCount = Math.floor(reveal * N)
      if (countRef.current) countRef.current.textContent = String(visibleCount)

      for (let i = 0; i < visibleCount; i++) {
        if (i === YOUR_IDX) continue
        const c = clusters[i]
        const x = c.x * W
        const y = c.y * H
        const fadeIn = Math.min(1, (visibleCount - i) / 30)
        ctx.beginPath()
        ctx.arc(x, y, c.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity * 0.3 * fadeIn})`
        ctx.fill()
      }

      if (reveal > 0.62 && visibleCount > YOUR_IDX) {
        const px = your.x * W
        const py = your.y * H
        const pulse = (Math.sin(t * 0.05) + 1) / 2
        const fadeIn = Math.min(1, (reveal - 0.62) * 5)

        ctx.beginPath()
        ctx.arc(px, py, 12 + pulse * 6, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201, 168, 76, ${(0.2 + pulse * 0.2) * fadeIn})`
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201, 168, 76, ${fadeIn})`
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(W / 2, H / 2)
        ctx.lineTo(px, py)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.2 * fadeIn})`
        ctx.lineWidth = 1
        ctx.setLineDash([2, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.beginPath()
      ctx.arc(W / 2, H / 2, 2, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(201, 168, 76, 0.4)"
      ctx.fill()

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <>
      <canvas id="cluster-canvas" ref={canvasRef} />
      <div className="cluster-count">
        <span ref={countRef}>0</span>
        <span className="slash">/</span>
        <span className="tot">2000</span>
      </div>
      <div className="cluster-overlay">
        <span>abstraction space · 2,000 clusters</span>
        <span className="hl">F.1247 · you are here</span>
      </div>
    </>
  )
}
