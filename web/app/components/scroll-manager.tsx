"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { scrollStore } from "@/app/lib/scroll-store"

gsap.registerPlugin(ScrollTrigger)

export function ScrollManager() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
    })

    lenis.on("scroll", ScrollTrigger.update)

    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)

    const hero = document.getElementById("hero")
    const c2 = document.getElementById("chapter-2")
    const c3 = document.getElementById("chapter-3")
    const heroContent = hero?.querySelector(".hero-content") as HTMLElement | null

    if (hero && c2 && c3) {
      // Hero — scroll progress, text fades out but canvas stays alive
      ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const h = self.progress
          scrollStore.setState({
            hero: h,
            heroPhase: h < 0.25 ? 1 : h < 0.7 ? 2 : 3,
          })
          if (heroContent) {
            if (h > 0.93) {
              const exit = (h - 0.93) / 0.07
              heroContent.style.opacity = String(1 - exit)
              heroContent.style.filter = `blur(${exit * 6}px)`
            } else {
              heroContent.style.opacity = ""
              heroContent.style.filter = ""
            }
          }
        },
      })

      // Chapter 2 — cross-dissolve entrance + depth exit
      const c2Inner = c2.querySelector(".chapter-inner") as HTMLElement
      const c2Sticky = c2.querySelector(".chapter-sticky") as HTMLElement
      ScrollTrigger.create({
        trigger: c2,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollStore.setState({ chapter2: self.progress })
          if (!c2Inner || !c2Sticky) return
          const p = self.progress

          // Background on sticky only (not the full scroll container)
          let bgAlpha = Math.min(0.82, p / 0.15 * 0.82)
          if (p > 0.8) bgAlpha *= 1 - (p - 0.8) / 0.2
          c2Sticky.style.backgroundColor = `rgba(0,0,0,${bgAlpha})`

          if (p < 0.2) {
            const t = p / 0.2
            const e = 1 - (1 - t) * (1 - t) * (1 - t)
            c2Inner.style.opacity = String(e)
            c2Inner.style.transform = `scale(${0.97 + e * 0.03})`
            c2Inner.style.filter = `blur(${(1 - e) * 6}px)`
          } else if (p > 0.8) {
            // Exit: fade out for cross-dissolve into chapter 3
            const t = (p - 0.8) / 0.2
            c2Inner.style.opacity = String(1 - t)
            c2Inner.style.filter = `blur(${t * 6}px)`
            c2Inner.style.transform = "scale(1)"
          } else {
            c2Inner.style.opacity = "1"
            c2Inner.style.transform = "scale(1)"
            c2Inner.style.filter = "blur(0px)"
          }
        },
      })

      // Chapter 3 — cross-dissolve entrance (same pattern as chapter 2)
      const c3Inner = c3.querySelector(".chapter-inner") as HTMLElement
      const c3Sticky = c3.querySelector(".chapter-sticky") as HTMLElement
      ScrollTrigger.create({
        trigger: c3,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollStore.setState({ chapter3: self.progress })
          if (!c3Inner || !c3Sticky) return
          const p = self.progress

          // Background on sticky only
          const bgAlpha = Math.min(0.82, p / 0.2 * 0.82)
          c3Sticky.style.backgroundColor = `rgba(0,0,0,${bgAlpha})`

          if (p < 0.3) {
            const t = p / 0.3
            const e = 1 - (1 - t) * (1 - t) * (1 - t)
            c3Inner.style.opacity = String(e)
            c3Inner.style.transform = `scale(${0.97 + e * 0.03})`
            c3Inner.style.filter = `blur(${(1 - e) * 6}px)`
          } else if (p > 0.8) {
            const t = (p - 0.8) / 0.2
            c3Inner.style.opacity = String(1 - t * 0.7)
            c3Inner.style.transform = `scale(${1 - t * 0.03})`
            c3Inner.style.filter = `blur(${t * 3}px)`
          } else {
            c3Inner.style.opacity = "1"
            c3Inner.style.transform = "scale(1)"
            c3Inner.style.filter = "blur(0px)"
          }
        },
      })

      // Page progress + active section
      const sectionEls = [
        { id: 1, el: hero },
        { id: 2, el: c2 },
        { id: 3, el: c3 },
        { id: 4, el: document.getElementById("explorer") },
        { id: 5, el: document.getElementById("strategy") },
      ].filter((s) => s.el)

      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const scrollY = window.scrollY
          const vpMid = scrollY + window.innerHeight / 2
          let active = 1
          for (const s of sectionEls) {
            if (!s.el) continue
            const top = s.el.getBoundingClientRect().top + scrollY
            if (vpMid >= top) active = s.id
          }
          scrollStore.setState({ page: self.progress, section: active })
        },
      })
    }

    // Pin explorer, strategy, and query sections
    const explorer = document.getElementById("explorer")
    const strategy = document.getElementById("strategy")
    const query = document.querySelector(".query-section")

    if (explorer) {
      ScrollTrigger.create({
        trigger: explorer,
        start: "top top",
        end: "+=50%",
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const el = explorer as HTMLElement
          if (self.progress > 0.7) {
            const t = (self.progress - 0.7) / 0.3
            el.style.filter = `blur(${t * 3}px)`
          } else {
            el.style.filter = ""
          }
        },
      })
    }
    if (strategy) {
      ScrollTrigger.create({
        trigger: strategy,
        start: "top top",
        end: "+=50%",
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const el = strategy as HTMLElement
          if (self.progress > 0.7) {
            const t = (self.progress - 0.7) / 0.3
            el.style.filter = `blur(${t * 3}px)`
          } else {
            el.style.filter = ""
          }
        },
      })
    }

    // Entrance animations — enhanced reveals with depth
    const reveals = document.querySelectorAll(".reveal")
    reveals.forEach((el) => {
      gsap.from(el, {
        y: 80,
        opacity: 0,
        scale: 0.97,
        filter: "blur(3px)",
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      })
    })

    // Staggered reveals with depth
    const revealGroups = document.querySelectorAll(".reveal-group")
    revealGroups.forEach((group) => {
      const children = group.querySelectorAll(".reveal-child")
      gsap.from(children, {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: group,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      })
    })

    return () => {
      gsap.ticker.remove(ticker)
      ScrollTrigger.getAll().forEach((t) => t.kill())
      lenis.destroy()
    }
  }, [])

  return null
}
