"use client"

import { useEffect, useRef } from "react"

export function FilmGrain() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const size = 150
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!
    const id = ctx.createImageData(size, size)
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255
      id.data[i] = v
      id.data[i + 1] = v
      id.data[i + 2] = v
      id.data[i + 3] = 255
    }
    ctx.putImageData(id, 0, 0)
    el.style.backgroundImage = `url(${canvas.toDataURL()})`
  }, [])

  return <div ref={ref} className="film-grain" />
}
