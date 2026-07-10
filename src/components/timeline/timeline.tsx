'use client'

// Generic, presentational multitrack timeline — DAW/NLE-style (GarageBand, After
// Effects). Domain-agnostic: it knows nothing about audio, video, or keyframes. It
// owns the ruler, fixed track-header column, horizontal zoom + scroll, click/drag
// scrubbing, and a playhead spanning every lane. Callers supply lane content via the
// `renderLane` render prop, so the same component drives audio waveforms today and
// video thumbnails / keyframe rows later.
//
// Controlled: `time` + `onSeek` are owned by the parent. Zoom/scroll are internal.
import { Minus, Plus, Scan } from 'lucide-react'
import { ReactNode, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

export type TimelineTrack = {
  id: string
  /** Rendered in the fixed left header column for this track. */
  header?: ReactNode
}

export type LaneContext = {
  track: TimelineTrack
  index: number
  pxPerSec: number
  /** Full lane width in px at the current zoom (duration * pxPerSec). */
  contentWidth: number
  laneHeight: number
}

export type TimelineProps = {
  durationSec: number
  time: number
  onSeek: (seconds: number) => void
  tracks: TimelineTrack[]
  renderLane: (ctx: LaneContext) => ReactNode
  /** Left side of the top bar (e.g. play button + time readout). */
  transport?: ReactNode
  /** When true, auto-scroll to keep the playhead visible (e.g. during playback). */
  follow?: boolean
  headerWidth?: number
  laneHeight?: number
  rulerHeight?: number
  maxPxPerSec?: number
  className?: string
}

/** mm:ss (or h:mm:ss) — kept local so the timeline has no domain dependencies. */
function formatTC(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  const mm = `${m}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : mm
}

/** Nice ruler tick interval targeting ~one label per 80px at the current zoom. */
function rulerStep(pxPerSec: number): number {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
  const target = 80 / pxPerSec
  return steps.find((s) => s >= target) ?? 600
}

export function Timeline({
  durationSec,
  time,
  onSeek,
  tracks,
  renderLane,
  transport,
  follow = false,
  headerWidth = 112,
  laneHeight = 44,
  rulerHeight = 22,
  maxPxPerSec = 600,
  className
}: TimelineProps) {
  const [pxPerSec, setPxPerSec] = useState(0) // 0 until measured
  const [fitPx, setFitPx] = useState(0) // zoom that fits duration to viewport (= min zoom)

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; px: number } | null>(null)
  const pxRef = useRef(0)
  useEffect(() => {
    pxRef.current = pxPerSec
  }, [pxPerSec])

  const contentW = durationSec * pxPerSec
  const lanesH = tracks.length * laneHeight
  const timelineH = rulerHeight + lanesH

  // Measure viewport → fit-to-width zoom (also the minimum zoom). Re-runs on resize.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !durationSec) return
    const measure = () => {
      const w = el.clientWidth
      if (!w) return
      const fit = w / durationSec
      setFitPx(fit)
      setPxPerSec((p) => (p === 0 ? fit : Math.max(fit, p)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [durationSec])

  const ticks = useMemo(() => {
    if (!pxPerSec) return []
    const step = rulerStep(pxPerSec)
    const out: number[] = []
    for (let t = 0; t <= durationSec; t += step) out.push(t)
    return out
  }, [pxPerSec, durationSec])

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const el = contentRef.current
      if (!el || !contentW) return
      const rect = el.getBoundingClientRect()
      onSeek(((clientX - rect.left) / rect.width) * durationSec)
    },
    [contentW, durationSec, onSeek]
  )

  // Zoom keeping the point under `anchorClientX` (else viewport center) fixed.
  const zoomTo = useCallback(
    (nextPx: number, anchorClientX?: number) => {
      const el = scrollRef.current
      if (!el) return
      const clamped = Math.max(fitPx, Math.min(maxPxPerSec, nextPx))
      const rect = el.getBoundingClientRect()
      const anchorX = anchorClientX != null ? anchorClientX - rect.left : el.clientWidth / 2
      const anchorTime = (el.scrollLeft + anchorX) / (pxRef.current || 1)
      setPxPerSec(clamped)
      requestAnimationFrame(() => {
        el.scrollLeft = anchorTime * clamped - anchorX
      })
    },
    [fitPx, maxPxPerSec]
  )
  const zoomRef = useRef(zoomTo)
  useEffect(() => {
    zoomRef.current = zoomTo
  }, [zoomTo])

  // Pointer handling: one finger/mouse scrubs, two fingers pinch-zoom (anchored at
  // the midpoint). Same handlers cover mouse, touch, and pen.
  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const p = pointersRef.current
      p.set(e.pointerId, { x: e.clientX, y: e.clientY })
      e.currentTarget.setPointerCapture(e.pointerId)
      if (p.size === 2) {
        const [a, b] = [...p.values()]
        pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, px: pxRef.current || 1 }
        draggingRef.current = false
      } else {
        draggingRef.current = true
        seekFromPointer(e.clientX)
      }
    },
    [seekFromPointer]
  )
  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const p = pointersRef.current
      if (p.has(e.pointerId)) p.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinchRef.current && p.size >= 2) {
        const [a, b] = [...p.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        zoomTo(pinchRef.current.px * (dist / pinchRef.current.dist), (a.x + b.x) / 2)
      } else if (draggingRef.current) {
        seekFromPointer(e.clientX)
      }
    },
    [seekFromPointer, zoomTo]
  )
  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    const p = pointersRef.current
    p.delete(e.pointerId)
    if (p.size < 2) pinchRef.current = null
    if (p.size === 0) draggingRef.current = false
  }, [])

  // ⌘/Ctrl + wheel to zoom (native listener so preventDefault works — React wheel is passive).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomRef.current((pxRef.current || 1) * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Auto-scroll while following: pin the playhead to the viewport center and let the
  // timeline glide under it. Runs every tick, so it moves by tiny per-frame deltas
  // (smooth) rather than snapping only when the playhead hits the edge. Clamped to the
  // scroll bounds, so the playhead travels freely from the left edge up to center and
  // from center out to the right edge — and doesn't scroll at all when the track fits.
  useEffect(() => {
    if (!follow) return
    const el = scrollRef.current
    if (!el) return
    const x = time * pxPerSec
    const target = Math.max(0, Math.min(x - el.clientWidth / 2, el.scrollWidth - el.clientWidth))
    el.scrollLeft = target
  }, [time, follow, pxPerSec])

  const playheadX = time * pxPerSec
  const zoomedIn = pxPerSec > fitPx * 1.01
  const atMax = pxPerSec >= maxPxPerSec
  const zoomPct = fitPx ? Math.round((pxPerSec / fitPx) * 100) : 100

  return (
    <div className={`overflow-hidden rounded-xl border bg-background ${className ?? ''}`}>
      {/* Top bar: transport (caller) + zoom controls */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b p-3">
        {transport}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => zoomTo(fitPx)} disabled={!zoomedIn}>
            <Scan className="mr-1.5 h-3.5 w-3.5" />
            Fit
          </Button>
          <div className="flex items-center overflow-hidden rounded-md border">
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => zoomTo(pxPerSec / 1.5)}
              disabled={!zoomedIn}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 border-x text-center text-xs font-medium tabular-nums text-muted-foreground">
              {zoomPct}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => zoomTo(pxPerSec * 1.5)}
              disabled={atMax}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Fixed track-header column */}
        <div className="shrink-0 border-r" style={{ width: headerWidth }}>
          <div style={{ height: rulerHeight }} className="border-b bg-muted/30" />
          {tracks.map((t) => (
            <div key={t.id} style={{ height: laneHeight }} className="border-b last:border-b-0">
              {t.header}
            </div>
          ))}
        </div>

        {/* Scrollable lane area */}
        <div ref={scrollRef} className="scrollbar-hover relative flex-1 overflow-x-auto overflow-y-hidden">
          <div
            ref={contentRef}
            className="relative cursor-pointer touch-none select-none"
            style={{ width: contentW || '100%', height: timelineH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Ruler */}
            <div style={{ height: rulerHeight }} className="relative border-b bg-muted/30">
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full border-l border-border/60" style={{ left: t * pxPerSec }}>
                  <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">{formatTC(t)}</span>
                </div>
              ))}
            </div>

            {/* Lanes (caller-rendered content) */}
            {tracks.map((track, index) => (
              <div key={track.id} style={{ height: laneHeight }} className="relative border-b last:border-b-0">
                {renderLane({ track, index, pxPerSec, contentWidth: contentW, laneHeight })}
              </div>
            ))}

            {/* Gridlines across all lanes */}
            <div className="pointer-events-none absolute inset-x-0" style={{ top: rulerHeight, height: lanesH }}>
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full border-l border-border/25" style={{ left: t * pxPerSec }} />
              ))}
            </div>

            {/* Playhead spanning ruler + all lanes */}
            <div className="pointer-events-none absolute top-0 z-10 w-0.5 bg-red-500" style={{ left: playheadX, height: timelineH }}>
              <div className="absolute -left-[3px] -top-0.5 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { formatTC }
