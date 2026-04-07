"use client"

import { useEffect, useRef, useState } from "react"
import { scrollStore } from "@/app/lib/scroll-store"

export function ProgressBar() {
  const fillRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const unsub = scrollStore.subscribe((s) => {
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${s.page})`
      }
    })
    return unsub
  }, [])

  if (!mounted) return null

  return (
    <div className="top-progress">
      <div className="top-progress-fill" ref={fillRef} />
    </div>
  )
}
