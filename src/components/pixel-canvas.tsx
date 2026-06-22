"use client"

import * as React from "react"

type Pixel = {
  x: number
  y: number
  size: number
  sizeStep: number
  maxSize: number
  delay: number
  counter: number
  counterStep: number
  isIdle: boolean
  isShimmer: boolean
  isReverse: boolean
}

const GAP = 6
const SHIMMER_SPEED = 0.05

// ponytail: single accent color (read from currentColor) instead of a palette array,
// each card already has one brand color — add multi-color if a card needs it later.
export function PixelCanvas({
  className,
  opacity = 1,
}: {
  className?: string
  opacity?: number
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const pixelsRef = React.useRef<Pixel[]>([])
  const colorRef = React.useRef("currentColor")
  const rafRef = React.useRef(0)

  const init = React.useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const { width, height } = wrap.getBoundingClientRect()
    const w = Math.floor(width)
    const h = Math.floor(height)
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    colorRef.current = getComputedStyle(wrap).color

    const pixels: Pixel[] = []
    for (let x = 0; x < w; x += GAP) {
      for (let y = 0; y < h; y += GAP) {
        const dx = x - w / 2
        const dy = y - h / 2
        pixels.push({
          x,
          y,
          size: 0,
          sizeStep: Math.random() * 0.4 + 0.1,
          maxSize: Math.random() * 1.5 + 0.5,
          delay: Math.sqrt(dx * dx + dy * dy),
          counter: 0,
          counterStep: Math.random() * 4 + (w + h) * 0.01,
          isIdle: false,
          isShimmer: false,
          isReverse: false,
        })
      }
    }
    pixelsRef.current = pixels
  }, [])

  const animate = React.useCallback((mode: "appear" | "disappear") => {
    cancelAnimationFrame(rafRef.current)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = colorRef.current
      ctx.globalAlpha = opacity

      const pixels = pixelsRef.current
      for (const p of pixels) {
        if (mode === "appear") {
          if (p.counter <= p.delay) {
            p.counter += p.counterStep
          } else if (p.isShimmer || p.size >= p.maxSize) {
            p.isShimmer = true
            p.size += p.isReverse ? -SHIMMER_SPEED : SHIMMER_SPEED
            if (p.size <= p.maxSize * 0.4) p.isReverse = false
            else if (p.size >= p.maxSize) p.isReverse = true
          } else {
            p.size += p.sizeStep
          }
        } else {
          p.isShimmer = false
          p.counter = 0
          if (p.size > 0) p.size -= 0.15
          else p.isIdle = true
        }
        if (p.size > 0) ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      if (mode === "disappear" && pixels.every((p) => p.isIdle)) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [opacity])

  React.useEffect(() => {
    init()
    const ro = new ResizeObserver(init)
    if (wrapRef.current) ro.observe(wrapRef.current)

    const card = wrapRef.current?.closest("[data-pixel-card]")
    const onEnter = () => animate("appear")
    const onLeave = () => animate("disappear")
    card?.addEventListener("pointerenter", onEnter)
    card?.addEventListener("pointerleave", onLeave)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      card?.removeEventListener("pointerenter", onEnter)
      card?.removeEventListener("pointerleave", onLeave)
    }
  }, [init, animate])

  return (
    <div
      ref={wrapRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
