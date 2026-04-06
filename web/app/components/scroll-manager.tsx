"use client"

import { useEffect } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

export function ScrollManager() {
  useEffect(() => {
    let ticking = false

    const update = () => {
      ticking = false
      const scrollY = window.scrollY
      const docH = document.documentElement.scrollHeight - window.innerHeight
      const page = Math.max(0, Math.min(1, scrollY / docH))

      const hero = document.getElementById("hero")
      const c2 = document.getElementById("chapter-2")
      const c3 = document.getElementById("chapter-3")
      if (!hero || !c2 || !c3) return

      const heroRect = hero.getBoundingClientRect()
      const heroH = hero.offsetHeight - window.innerHeight
      const heroProg = Math.max(0, Math.min(1, -heroRect.top / heroH))

      const heroPhase: 1 | 2 | 3 =
        heroProg < 0.33 ? 1 : heroProg < 0.66 ? 2 : 3

      const c2Rect = c2.getBoundingClientRect()
      const c2H = c2.offsetHeight - window.innerHeight
      const chapter2 = Math.max(0, Math.min(1, -c2Rect.top / c2H))

      const c3Rect = c3.getBoundingClientRect()
      const c3H = c3.offsetHeight - window.innerHeight
      const chapter3 = Math.max(0, Math.min(1, -c3Rect.top / c3H))

      const vpMid = scrollY + window.innerHeight / 2
      const sections: [number, string][] = [
        [1, "hero"],
        [2, "chapter-2"],
        [3, "chapter-3"],
        [4, "explorer"],
        [5, "strategy"],
      ]
      let active = 1
      for (const [id, elId] of sections) {
        const el = document.getElementById(elId)
        if (!el) continue
        const top = el.getBoundingClientRect().top + window.scrollY
        if (vpMid >= top) active = id
      }

      scrollStore.setState({
        page,
        hero: heroProg,
        heroPhase,
        chapter2,
        chapter3,
        section: active,
      })
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", update)
    }
  }, [])

  return null
}
