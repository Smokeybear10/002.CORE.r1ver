"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  opacity: number
  phase: number
  orbitR: number
  orbitSpeed: number
  orbitPhase: number
}

const RINGS = [
  { radius: 180, opacity: 0.08, speed: 0.0002 },
  { radius: 280, opacity: 0.05, speed: -0.00015 },
  { radius: 380, opacity: 0.03, speed: 0.0001 },
]

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    const particles: Particle[] = []
    for (let i = 0; i < 220; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2,
        orbitR: 100 + Math.random() * 280,
        orbitSpeed: 0.003 + Math.random() * 0.004,
        orbitPhase: Math.random() * Math.PI * 2,
      })
    }

    let t = 0
    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const cx = W / 2
      const cy = H / 2
      const scroll = scrollStore.getState().hero

      for (let i = 0; i < RINGS.length; i++) {
        const ring = RINGS[i]
        const ringR = ring.radius * (1 + scroll * 0.3)
        const ringOp = ring.opacity * (1 + scroll * 1.2)
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201, 168, 76, ${ringOp})`
        ctx.lineWidth = 1 + scroll
        ctx.setLineDash([2, 8])
        ctx.lineDashOffset = t * ring.speed * 1000 * (1 + scroll * 3)
        ctx.stroke()
        ctx.setLineDash([])
      }

      const crossSize = 8 + scroll * 16
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.15 + scroll * 0.3})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - crossSize, cy)
      ctx.lineTo(cx + crossSize, cy)
      ctx.moveTo(cx, cy - crossSize)
      ctx.lineTo(cx, cy + crossSize)
      ctx.stroke()

      if (scroll > 0.6) {
        const t3 = Math.min(1, (scroll - 0.6) / 0.4)
        const eased = t3 * (2 - t3)
        const equityAngle = Math.PI * 2 * 0.583 * eased
        ctx.beginPath()
        ctx.arc(cx, cy, 240, -Math.PI / 2, -Math.PI / 2 + equityAngle)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.7 * eased})`
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, 240, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.1 * eased})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      for (const p of particles) {
        if (scroll < 0.33) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0) p.x = W
          if (p.x > W) p.x = 0
          if (p.y < 0) p.y = H
          if (p.y > H) p.y = 0
        } else if (scroll < 0.66) {
          const t2 = (scroll - 0.33) / 0.33
          p.orbitPhase += p.orbitSpeed
          const targetR = p.orbitR * (1 - t2 * 0.6)
          const tx = cx + Math.cos(p.orbitPhase) * targetR
          const ty = cy + Math.sin(p.orbitPhase) * targetR
          p.x += (tx - p.x) * 0.08
          p.y += (ty - p.y) * 0.08
        } else {
          const t3 = (scroll - 0.66) / 0.34
          p.orbitPhase += p.orbitSpeed * (1 + t3 * 2)
          const targetR = p.orbitR * 0.4 + (p.r > 1 ? 180 : 100)
          const tx = cx + Math.cos(p.orbitPhase) * targetR
          const ty = cy + Math.sin(p.orbitPhase) * targetR
          p.x += (tx - p.x) * 0.12
          p.y += (ty - p.y) * 0.12
        }

        p.phase += 0.01
        const twinkle = (Math.sin(p.phase) + 1) / 2
        const op = p.opacity * (0.5 + twinkle * 0.5) * (1 + scroll * 0.5)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (1 + scroll * 0.3), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201, 168, 76, ${Math.min(1, op)})`
        ctx.fill()
      }

      const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
      vignette.addColorStop(0, "rgba(0,0,0,0)")
      vignette.addColorStop(1, `rgba(0,0,0,${0.85 - scroll * 0.1})`)
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, W, H)

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas id="hero-canvas" ref={canvasRef} />
}
