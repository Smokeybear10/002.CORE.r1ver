"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
}

const SECTION_TINT: Record<number, string> = {
  1: "rgba(201,168,76,0.03)",
  2: "rgba(201,168,76,0.02)",
  3: "rgba(201,168,76,0.025)",
  4: "rgba(201,168,76,0.015)",
  5: "rgba(201,168,76,0.02)",
}

export function BgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight
    let dpr = window.devicePixelRatio || 1

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const ambient: Particle[] = []
    for (let i = 0; i < 60; i++) {
      ambient.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 0.8 + 0.2,
        phase: Math.random() * Math.PI * 2,
      })
    }

    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const section = scrollStore.getState().section
      const tint = SECTION_TINT[section] ?? "rgba(201,168,76,0.02)"
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.9)
      grad.addColorStop(0, tint)
      grad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      for (const p of ambient) {
        p.x += p.vx
        p.y += p.vy
        p.phase += 0.008
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0
        const twinkle = (Math.sin(p.phase) + 1) / 2
        const op = 0.1 + twinkle * 0.15
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${op})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} />
}
