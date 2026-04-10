"use client"

import { useEffect, useRef, type ReactNode } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

type Props = {
  children: ReactNode
  className?: string
  as?: "h1" | "h2" | "h3" | "p" | "div" | "span"
  triggerStart?: string
  stagger?: number
  delay?: number
  duration?: number
}

export function SplitText({
  children,
  className,
  as: Tag = "div",
  triggerStart = "top 82%",
  stagger = 0.04,
  delay = 0,
  duration = 0.9,
}: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const ctx = gsap.context(() => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNodes: Text[] = []
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

      const inners: HTMLElement[] = []
      for (const node of textNodes) {
        const parts = node.textContent?.split(/(\s+)/) ?? []
        const frag = document.createDocumentFragment()
        for (const part of parts) {
          if (!part) continue
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part))
            continue
          }
          const outer = document.createElement("span")
          outer.style.cssText =
            "overflow:hidden;display:inline-block;vertical-align:top;padding-bottom:0.1em"
          const inner = document.createElement("span")
          inner.style.cssText = "display:inline-block;will-change:transform"
          inner.textContent = part
          outer.appendChild(inner)
          frag.appendChild(outer)
          inners.push(inner)
        }
        node.parentNode?.replaceChild(frag, node)
      }

      gsap.set(inners, { yPercent: 110, opacity: 0 })

      gsap.to(inners, {
        yPercent: 0,
        opacity: 1,
        duration,
        stagger,
        delay,
        ease: "power4.out",
        scrollTrigger: {
          trigger: el,
          start: triggerStart,
          toggleActions: "play none none none",
        },
      })
    }, el)

    return () => ctx.revert()
  }, [triggerStart, stagger, delay, duration])

  return (
    // @ts-expect-error dynamic tag ref
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
