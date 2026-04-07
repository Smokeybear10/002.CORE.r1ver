"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

type Particle = {
  x: number; y: number; vx: number; vy: number
  r: number; opacity: number; phase: number
  orbitR: number; orbitSpeed: number; orbitPhase: number
}

const RINGS = [
  { radius: 180, opacity: 0.08, speed: 0.0002 },
  { radius: 280, opacity: 0.05, speed: -0.00015 },
  { radius: 380, opacity: 0.03, speed: 0.0001 },
]
const N = 220

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
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const particles: Particle[] = []
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.3, opacity: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2,
        orbitR: 100 + Math.random() * 280,
        orbitSpeed: 0.003 + Math.random() * 0.004,
        orbitPhase: Math.random() * Math.PI * 2,
      })
    }

    // Smooth fade trackers for each section's geometric elements
    let heroGeo = 1
    let shapeGeo = 0
    let spaceGeo = 0

    const bell = (x: number) => Math.exp(-x * x / 2)

    let t = 0
    let raf = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const cx = W / 2
      const cy = H / 2
      const state = scrollStore.getState()
      const { hero, chapter2, chapter3, section } = state
      const exitT = hero > 0.92 ? (hero - 0.92) / 0.08 : 0
      const exitE = exitT * exitT * exitT

      // Smooth geo fades
      heroGeo += ((section === 1 ? 1 : 0) - heroGeo) * 0.05
      shapeGeo += ((section === 2 ? 1 : 0) - shapeGeo) * 0.04
      spaceGeo += ((section === 3 ? 1 : 0) - spaceGeo) * 0.04

      // ════════════════════════════════════════════
      // HERO GEOMETRIC ELEMENTS
      // ════════════════════════════════════════════
      if (heroGeo > 0.01) {
        for (const ring of RINGS) {
          const ringR = ring.radius * (1 + hero * 0.3 + exitE * 5)
          const flash = exitT > 0 ? Math.max(0, 1 + exitT * 3 - exitE * 5) : 1
          const op = ring.opacity * (1 + hero * 1.2) * flash * heroGeo
          if (op < 0.001) continue
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${Math.max(0, op)})`
          ctx.lineWidth = 1 + hero + exitT * 2
          ctx.setLineDash([2, 8])
          ctx.lineDashOffset = t * ring.speed * 1000 * (1 + hero * 3 + exitT * 10)
          ctx.stroke(); ctx.setLineDash([])
        }

        const crossSz = 8 + hero * 16 + exitE * 300
        const crossOp = (0.15 + hero * 0.3) * (exitT > 0 ? Math.max(0, 1 - exitT * 1.5) : 1) * heroGeo
        if (crossOp > 0.001) {
          ctx.save(); ctx.translate(cx, cy)
          if (exitT > 0) ctx.rotate(exitT * Math.PI * 0.25)
          ctx.strokeStyle = `rgba(201,168,76,${crossOp})`
          ctx.lineWidth = 1; ctx.beginPath()
          ctx.moveTo(-crossSz, 0); ctx.lineTo(crossSz, 0)
          ctx.moveTo(0, -crossSz); ctx.lineTo(0, crossSz)
          ctx.stroke(); ctx.restore()
        }

        if (hero > 0.6) {
          const at = Math.min(1, (hero - 0.6) / 0.4), ae = at * (2 - at)
          const arcR = 240 + exitE * 600
          const af = exitT > 0 ? Math.max(0, 1 - exitT * 1.3) : 1
          const aOp = ae * af * heroGeo
          if (aOp > 0.001) {
            ctx.beginPath()
            ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.583 * ae)
            ctx.strokeStyle = `rgba(201,168,76,${0.7 * aOp})`; ctx.lineWidth = 3 + exitT * 2; ctx.stroke()
            ctx.beginPath(); ctx.arc(cx, cy, arcR, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(201,168,76,${0.1 * aOp})`; ctx.lineWidth = 1; ctx.stroke()
          }
        }

        if (exitT > 0 && heroGeo > 0.01) {
          const rayLen = exitE * 800
          const rayOp = exitT * 0.35 * Math.max(0, 1 - exitT * 0.7) * heroGeo
          ctx.save(); ctx.translate(cx, cy)
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 0.0003
            ctx.beginPath()
            ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30)
            ctx.lineTo(Math.cos(a) * (30 + rayLen), Math.sin(a) * (30 + rayLen))
            ctx.strokeStyle = `rgba(201,168,76,${rayOp})`
            ctx.lineWidth = 0.5 + exitT; ctx.stroke()
          }
          ctx.restore()
        }
      }

      // ════════════════════════════════════════════
      // CHAPTER SHAPE GEOMETRIC ELEMENTS
      // ════════════════════════════════════════════
      if (shapeGeo > 0.01) {
        const axisY = cy + H * 0.22
        const lx = W * 0.08, rx = W * 0.92, cw = rx - lx
        const g = shapeGeo

        // Horizontal axis
        ctx.beginPath(); ctx.moveTo(lx, axisY); ctx.lineTo(rx, axisY)
        ctx.strokeStyle = `rgba(201,168,76,${0.08 * g})`
        ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([])

        // Vertical axis
        ctx.beginPath(); ctx.moveTo(lx, cy - H * 0.32); ctx.lineTo(lx, axisY + 16)
        ctx.strokeStyle = `rgba(201,168,76,${0.05 * g})`
        ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([])

        // Tick marks
        for (let i = 0; i <= 10; i++) {
          const tx = lx + (i / 10) * cw
          ctx.beginPath(); ctx.moveTo(tx, axisY - 4); ctx.lineTo(tx, axisY + 4)
          ctx.strokeStyle = `rgba(201,168,76,${0.06 * g})`; ctx.lineWidth = 1; ctx.stroke()
        }

        // Horizontal guide lines
        for (let i = 1; i <= 3; i++) {
          const gy = axisY - (i / 3) * H * 0.3
          ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(rx, gy)
          ctx.strokeStyle = `rgba(201,168,76,${0.025 * g})`
          ctx.lineWidth = 0.5; ctx.setLineDash([1, 6]); ctx.stroke(); ctx.setLineDash([])
        }

        // Bell curve outline
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const x = lx + (i / 120) * cw
          const y = axisY - bell((i / 120 - 0.5) * 4) * H * 0.3
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(201,168,76,${0.15 * g})`; ctx.lineWidth = 1.5; ctx.stroke()

        // Filled area under curve (gradient)
        const fillProg = Math.min(1, chapter2 * 1.5)
        if (fillProg > 0) {
          ctx.beginPath(); ctx.moveTo(lx, axisY)
          const fillEnd = Math.floor(fillProg * 120)
          for (let i = 0; i <= fillEnd; i++) {
            const x = lx + (i / 120) * cw
            ctx.lineTo(x, axisY - bell((i / 120 - 0.5) * 4) * H * 0.3)
          }
          ctx.lineTo(lx + (fillEnd / 120) * cw, axisY); ctx.closePath()
          const grd = ctx.createLinearGradient(0, cy - H * 0.3, 0, axisY)
          grd.addColorStop(0, `rgba(201,168,76,${0.06 * g * fillProg})`)
          grd.addColorStop(1, `rgba(201,168,76,0)`)
          ctx.fillStyle = grd; ctx.fill()
        }

        // Scanning vertical line
        const scanX = lx + chapter2 * cw
        ctx.beginPath(); ctx.moveTo(scanX, cy - H * 0.34); ctx.lineTo(scanX, axisY + 12)
        ctx.strokeStyle = `rgba(201,168,76,${0.18 * g})`
        ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([])

        // Scanning dot on curve
        const scanBell = bell((chapter2 - 0.5) * 4)
        const scanDotY = axisY - scanBell * H * 0.3
        ctx.beginPath(); ctx.arc(scanX, scanDotY, 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${0.7 * g})`; ctx.fill()
        // Glow ring
        ctx.beginPath(); ctx.arc(scanX, scanDotY, 10 + (Math.sin(t * 0.04) + 1) * 3, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201,168,76,${0.12 * g})`; ctx.lineWidth = 1; ctx.stroke()

        // Median marker
        const medX = lx + 0.5 * cw
        ctx.beginPath(); ctx.moveTo(medX, axisY - 4); ctx.lineTo(medX, axisY - bell(0) * H * 0.3 - 8)
        ctx.strokeStyle = `rgba(201,168,76,${0.06 * g})`
        ctx.lineWidth = 1; ctx.setLineDash([1, 3]); ctx.stroke(); ctx.setLineDash([])

        // Standard deviation markers
        for (const sd of [-1, 1, -2, 2]) {
          const sdX = lx + (0.5 + sd / 4) * cw
          const sdY = axisY - bell(sd) * H * 0.3
          ctx.beginPath(); ctx.arc(sdX, sdY, 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${0.15 * g})`; ctx.fill()
        }
      }

      // ════════════════════════════════════════════
      // CHAPTER SPACE GEOMETRIC ELEMENTS (scroll-driven)
      // ════════════════════════════════════════════
      if (spaceGeo > 0.01) {
        const g = spaceGeo
        const sp = chapter3 // scroll progress drives everything
        const minD = Math.min(W, H)

        // Concentric circles — reveal one by one with scroll
        const circleRadii = [0.12, 0.24, 0.36, 0.48]
        for (let i = 0; i < circleRadii.length; i++) {
          const threshold = i * 0.12 // 0, 0.12, 0.24, 0.36
          const circleOp = Math.min(1, Math.max(0, (sp - threshold) * 8)) * 0.06 * g
          if (circleOp < 0.001) continue
          ctx.beginPath(); ctx.arc(cx, cy, minD * circleRadii[i], 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${circleOp})`
          ctx.lineWidth = 1; ctx.setLineDash([1, 5]); ctx.stroke(); ctx.setLineDash([])
        }

        // Radial grid lines — draw outward with scroll
        const lineLen = Math.min(1, sp * 3) * minD * 0.48
        if (lineLen > 5) {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + sp * Math.PI * 0.15
            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15)
            ctx.lineTo(cx + Math.cos(a) * lineLen, cy + Math.sin(a) * lineLen)
            ctx.strokeStyle = `rgba(201,168,76,${0.03 * g})`
            ctx.lineWidth = 0.5; ctx.setLineDash([1, 4]); ctx.stroke(); ctx.setLineDash([])
          }
        }

        // Center crosshair — appears early
        const centerOp = Math.min(1, sp * 6) * g
        ctx.strokeStyle = `rgba(201,168,76,${0.15 * centerOp})`; ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy)
        ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8)
        ctx.stroke()
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${0.3 * centerOp})`; ctx.fill()

        // Clusters — appear one by one, rotate based on scroll
        for (let ci = 0; ci < 5; ci++) {
          const clusterThreshold = 0.1 + ci * 0.08
          const clusterVis = Math.min(1, Math.max(0, (sp - clusterThreshold) * 6))
          if (clusterVis < 0.01) continue

          const ca = (ci / 5) * Math.PI * 2 + sp * Math.PI * 0.4
          const ccx = cx + Math.cos(ca) * minD * 0.22
          const ccy = cy + Math.sin(ca) * minD * 0.22

          // Cluster crosshair
          ctx.strokeStyle = `rgba(201,168,76,${0.12 * g * clusterVis})`; ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(ccx - 6, ccy); ctx.lineTo(ccx + 6, ccy)
          ctx.moveTo(ccx, ccy - 6); ctx.lineTo(ccx, ccy + 6)
          ctx.stroke()

          // Cluster orbit ring
          ctx.beginPath(); ctx.arc(ccx, ccy, 35 + ci * 12, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${0.04 * g * clusterVis})`
          ctx.lineWidth = 0.5; ctx.setLineDash([1, 3]); ctx.stroke(); ctx.setLineDash([])

          // Line from center to cluster — draws with scroll
          const connLen = clusterVis
          const dx = ccx - cx, dy = ccy - cy
          ctx.beginPath(); ctx.moveTo(cx, cy)
          ctx.lineTo(cx + dx * connLen, cy + dy * connLen)
          ctx.strokeStyle = `rgba(201,168,76,${0.04 * g * clusterVis})`
          ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([])
        }

        // "You are here" — appears at 50% scroll
        if (sp > 0.45) {
          const youVis = Math.min(1, (sp - 0.45) * 5)
          const youA = 1247 / 2000 * Math.PI * 2
          const youR = minD * 0.28
          const youX = cx + Math.cos(youA) * youR
          const youY = cy + Math.sin(youA) * youR
          const pulse = (Math.sin(sp * Math.PI * 8) + 1) / 2

          ctx.beginPath(); ctx.arc(youX, youY, 10 + pulse * 5, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${(0.15 + pulse * 0.15) * g * youVis})`
          ctx.lineWidth = 1; ctx.stroke()
          ctx.beginPath(); ctx.arc(youX, youY, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${0.8 * g * youVis})`; ctx.fill()

          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(youX, youY)
          ctx.strokeStyle = `rgba(201,168,76,${0.08 * g * youVis})`
          ctx.lineWidth = 0.5; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([])
        }

        // Radar sweep — angle driven by scroll
        const sweepA = sp * Math.PI * 4
        const sweepLen = minD * 0.45 * Math.min(1, sp * 2.5)
        if (sweepLen > 10) {
          ctx.beginPath(); ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(sweepA) * sweepLen, cy + Math.sin(sweepA) * sweepLen)
          ctx.strokeStyle = `rgba(201,168,76,${0.06 * g})`; ctx.lineWidth = 1; ctx.stroke()

          // Sweep trail arc
          ctx.beginPath(); ctx.arc(cx, cy, sweepLen * 0.7, sweepA - 0.5, sweepA)
          ctx.strokeStyle = `rgba(201,168,76,${0.025 * g})`; ctx.lineWidth = 25; ctx.stroke()
        }

        // Expanding reveal ring
        if (sp < 0.6) {
          const revealR = minD * 0.48 * sp * 2
          ctx.beginPath(); ctx.arc(cx, cy, revealR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${0.08 * g * (1 - sp * 1.7)})`
          ctx.lineWidth = 1.5; ctx.stroke()
        }
      }

      // ════════════════════════════════════════════
      // PARTICLES — section-aware behavior
      // ════════════════════════════════════════════
      const opMul = section === 1 ? 1 : section <= 3 ? 0.7 : 0.25

      for (let i = 0; i < N; i++) {
        const p = particles[i]

        if (section === 1) {
          if (hero < 0.25) {
            p.x += p.vx; p.y += p.vy
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
          } else if (hero < 0.7) {
            const ht = (hero - 0.25) / 0.45
            p.orbitPhase += p.orbitSpeed
            const tr = p.orbitR * (1 - ht * 0.6)
            p.x += (cx + Math.cos(p.orbitPhase) * tr - p.x) * 0.08
            p.y += (cy + Math.sin(p.orbitPhase) * tr - p.y) * 0.08
          } else if (hero < 0.85) {
            p.orbitPhase += p.orbitSpeed * (1 + ((hero - 0.7) / 0.15) * 2)
            const tr = p.orbitR * 0.4 + (p.r > 1 ? 180 : 100)
            p.x += (cx + Math.cos(p.orbitPhase) * tr - p.x) * 0.12
            p.y += (cy + Math.sin(p.orbitPhase) * tr - p.y) * 0.12
          } else {
            p.orbitPhase += p.orbitSpeed * (3 + exitE * 12)
            const sr = p.orbitR * 0.4 + (p.r > 1 ? 180 : 100) + exitE * (500 + p.orbitR)
            p.x += (cx + Math.cos(p.orbitPhase) * sr - p.x) * 0.06
            p.y += (cy + Math.sin(p.orbitPhase) * sr - p.y) * 0.06
          }
        } else if (section === 2) {
          // Particles flow along bell curve
          const axisY = cy + H * 0.22
          const lx = W * 0.08, cw = W * 0.84
          p.orbitPhase += p.orbitSpeed * 0.2
          const curvePos = i / N
          const tx = lx + curvePos * cw + Math.sin(t * 0.0008 + i * 0.05) * 25
          const bv = bell((curvePos - 0.5) * 4)
          const ty = axisY - bv * H * 0.3 + Math.cos(p.orbitPhase) * (8 + (1 - bv) * 25)
          p.x += (tx - p.x) * 0.018
          p.y += (ty - p.y) * 0.018
        } else if (section === 3) {
          // Particles in scroll-driven clusters
          const nc = 5, ci = i % nc
          const ca = (ci / nc) * Math.PI * 2 + chapter3 * Math.PI * 0.4
          const spread = Math.min(1, chapter3 * 2.5)
          const ccx = cx + Math.cos(ca) * Math.min(W, H) * 0.22 * spread
          const ccy = cy + Math.sin(ca) * Math.min(W, H) * 0.22 * spread
          const la = i * 137.5 * Math.PI / 180 + chapter3 * Math.PI * 1.2
          const lr = (20 + (i % 18) * 4.5) * spread
          p.x += (ccx + Math.cos(la) * lr - p.x) * 0.018
          p.y += (ccy + Math.sin(la) * lr - p.y) * 0.018
        } else {
          p.x += p.vx * 0.15; p.y += p.vy * 0.15
          if (p.x < -30) p.x = W + 30; if (p.x > W + 30) p.x = -30
          if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30
        }

        p.phase += 0.01
        const tw = (Math.sin(p.phase) + 1) / 2
        const exitGlow = exitT > 0 ? Math.max(0, 1 - exitT * 2) * 1.5 : 0
        const op = p.opacity * (0.5 + tw * 0.5) * (1 + (section === 1 ? hero * 0.5 : 0) + exitGlow) * opMul
        const sz = p.r * (1 + (section === 1 ? hero * 0.3 + exitE * 1.5 : 0))

        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(0.2, sz), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${Math.min(1, Math.max(0, op))})`
        ctx.fill()
      }

      // ── CONNECTION LINES — chapters ──
      if (section === 2 || section === 3) {
        for (let i = 0; i < N; i += 2) {
          for (let j = i + 1; j < Math.min(i + 8, N); j++) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const d = dx * dx + dy * dy
            if (d < 8100) {
              ctx.beginPath()
              ctx.moveTo(particles[i].x, particles[i].y)
              ctx.lineTo(particles[j].x, particles[j].y)
              ctx.strokeStyle = `rgba(201,168,76,${(1 - Math.sqrt(d) / 90) * 0.05})`
              ctx.lineWidth = 0.5; ctx.stroke()
            }
          }
        }
      }

      // ── VIGNETTE ──
      const vigStr = section === 1 ? Math.max(0, 0.85 - hero * 0.1 - exitE * 0.5) : 0.5
      const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
      vig.addColorStop(0, "rgba(0,0,0,0)")
      vig.addColorStop(1, `rgba(0,0,0,${vigStr})`)
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} />
}
