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
      const exitT = scroll > 0.85 ? (scroll - 0.85) / 0.15 : 0
      const exitE = exitT * exitT

      // RINGS — expand dramatically during exit
      for (let i = 0; i < RINGS.length; i++) {
        const ring = RINGS[i]
        const ringR = ring.radius * (1 + scroll * 0.3 + exitE * 5)
        const flash = exitT > 0 ? Math.max(0, 1 + exitT * 3 - exitE * 5) : 1
        const ringOp = ring.opacity * (1 + scroll * 1.2) * flash
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201, 168, 76, ${Math.max(0, ringOp)})`
        ctx.lineWidth = 1 + scroll + exitT * 2
        ctx.setLineDash([2, 8])
        ctx.lineDashOffset = t * ring.speed * 1000 * (1 + scroll * 3 + exitT * 10)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // CROSSHAIR — grows and rotates during exit
      const crossSize = 8 + scroll * 16 + exitE * 300
      const crossOp = (0.15 + scroll * 0.3) * (exitT > 0 ? Math.max(0, 1 - exitT * 1.5) : 1)
      ctx.save()
      ctx.translate(cx, cy)
      if (exitT > 0) ctx.rotate(exitT * Math.PI * 0.25)
      ctx.strokeStyle = `rgba(201, 168, 76, ${Math.max(0, crossOp)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-crossSize, 0)
      ctx.lineTo(crossSize, 0)
      ctx.moveTo(0, -crossSize)
      ctx.lineTo(0, crossSize)
      ctx.stroke()
      ctx.restore()

      // EQUITY ARC — expands during exit
      if (scroll > 0.6) {
        const t3 = Math.min(1, (scroll - 0.6) / 0.4)
        const eased = t3 * (2 - t3)
        const equityAngle = Math.PI * 2 * 0.583 * eased
        const arcR = 240 + exitE * 600
        const arcFade = exitT > 0 ? Math.max(0, 1 - exitT * 1.3) : 1

        ctx.beginPath()
        ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + equityAngle)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.7 * eased * arcFade})`
        ctx.lineWidth = 3 + exitT * 2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, arcR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201, 168, 76, ${0.1 * eased * arcFade})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // RADIAL BURST — gold rays during exit only
      if (exitT > 0) {
        const numRays = 16
        const rayLen = exitE * 800
        const rayOp = exitT * 0.35 * Math.max(0, 1 - exitT * 0.7)
        ctx.save()
        ctx.translate(cx, cy)
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2 + t * 0.0003
          ctx.beginPath()
          ctx.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30)
          ctx.lineTo(Math.cos(angle) * (30 + rayLen), Math.sin(angle) * (30 + rayLen))
          ctx.strokeStyle = `rgba(201, 168, 76, ${rayOp})`
          ctx.lineWidth = 0.5 + exitT
          ctx.stroke()
        }
        ctx.restore()
      }

      // PARTICLES
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
        } else if (scroll < 0.85) {
          const t3 = (scroll - 0.66) / 0.19
          p.orbitPhase += p.orbitSpeed * (1 + t3 * 2)
          const targetR = p.orbitR * 0.4 + (p.r > 1 ? 180 : 100)
          const tx = cx + Math.cos(p.orbitPhase) * targetR
          const ty = cy + Math.sin(p.orbitPhase) * targetR
          p.x += (tx - p.x) * 0.12
          p.y += (ty - p.y) * 0.12
        } else {
          // Exit: scatter outward
          p.orbitPhase += p.orbitSpeed * (3 + exitE * 12)
          const baseR = p.orbitR * 0.4 + (p.r > 1 ? 180 : 100)
          const scatterR = baseR + exitE * (500 + p.orbitR)
          const tx = cx + Math.cos(p.orbitPhase) * scatterR
          const ty = cy + Math.sin(p.orbitPhase) * scatterR
          p.x += (tx - p.x) * 0.06
          p.y += (ty - p.y) * 0.06
        }

        p.phase += 0.01
        const twinkle = (Math.sin(p.phase) + 1) / 2
        const exitGlow = exitT > 0 ? Math.max(0, 1 - exitT * 2) * 1.5 : 0
        const op = p.opacity * (0.5 + twinkle * 0.5) * (1 + scroll * 0.5 + exitGlow)
        const size = p.r * (1 + scroll * 0.3 + exitE * 1.5)

        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201, 168, 76, ${Math.min(1, op)})`
        ctx.fill()
      }

      // VIGNETTE — opens up during exit
      const vigStr = Math.max(0, 0.85 - scroll * 0.1 - exitE * 0.5)
      const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
      vignette.addColorStop(0, "rgba(0,0,0,0)")
      vignette.addColorStop(1, `rgba(0,0,0,${vigStr})`)
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
