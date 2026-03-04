"use client"

import { MessageSquareText, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { AnnotationInfo } from "@/lib/header-annotations"
import type { OpenAnnotationData } from "./annotation-provider"
import type { ReactNode } from "react"
import { useAnnotation } from "./annotation-provider"

/* ═══════════════════════════════════════════════════
   CommentMarker — small amber ? tab next to headers
   ═══════════════════════════════════════════════════ */

interface CommentMarkerProps {
  id: string
  info: AnnotationInfo | undefined
}

export function CommentMarker({ id, info }: CommentMarkerProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const { openAnnotations, toggle } = useAnnotation()
  const isOpen = openAnnotations.has(id)

  if (!info) return null

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={`Annotation: ${info.title}`}
      onClick={(e) => {
        e.stopPropagation()
        const rect = btnRef.current!.getBoundingClientRect()
        toggle(id, info, rect.left + rect.width / 2)
      }}
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all select-none cursor-pointer border ${
        isOpen
          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40"
      }`}
    >
      <MessageSquareText className="h-2.5 w-2.5" />
      <span>?</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════════
   AnnotatedRow — highlight + accent bar on active side
   Registers its ref for connector positioning.
   ═══════════════════════════════════════════════════ */

interface AnnotatedRowProps {
  id: string
  children: ReactNode
  className?: string
}

export function AnnotatedRow({
  id,
  children,
  className = "",
}: AnnotatedRowProps) {
  const { openAnnotations, registerRow, cardSides } = useAnnotation()
  const isOpen = openAnnotations.has(id)
  const side = cardSides.get(id) ?? "left"

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      registerRow(id, isOpen ? el : null)
    },
    [id, isOpen, registerRow]
  )

  const accentLeft =
    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-amber-500 before:rounded-r"
  const accentRight =
    "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-amber-500 after:rounded-l"

  return (
    <div
      ref={refCallback}
      className={`relative transition-all duration-200 ${
        isOpen
          ? `bg-amber-50 dark:bg-amber-950/20 ${side === "left" ? accentLeft : accentRight}`
          : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   CardBody — shared content for desktop & mobile cards
   ═══════════════════════════════════════════════════ */

function CardBody({
  info,
  onClose,
}: {
  info: OpenAnnotationData
  onClose: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <MessageSquareText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground leading-tight">
            {info.title}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            annotation
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close annotation"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-2 pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 font-mono mb-0.5">
          What this means
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {info.description}
        </p>
      </div>

      {info.why && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 font-mono mb-0.5">
            Why it matters
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {info.why}
          </p>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-mono mb-0.5">
          How to read
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {info.howToRead}
        </p>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════
   Positioned card data — computed from row positions
   ═══════════════════════════════════════════════════ */

interface CardPosition {
  id: string
  info: OpenAnnotationData
  side: "left" | "right"
  top: number
}

const CARD_GAP = 8
const ESTIMATED_CARD_HEIGHT = 240
const CARD_WIDTH = "420px"

function computeCardPositions(
  openAnnotations: Map<string, OpenAnnotationData>,
  getRowEl: (id: string) => HTMLElement | undefined,
  containerEl: HTMLElement
): CardPosition[] {
  const containerRect = containerEl.getBoundingClientRect()
  const containerCenter = containerRect.left + containerRect.width / 2

  // Build list with row Y positions
  // Table items (id starts with "header-") are flexible — full-width rows
  // Non-table items are fixed to their natural side (markerX position)
  const items: Array<{
    id: string
    info: OpenAnnotationData
    rowMidY: number
    flexible: boolean
    side: "left" | "right"
  }> = []

  for (const [id, info] of openAnnotations) {
    const rowEl = getRowEl(id)
    if (!rowEl) continue
    const rRect = rowEl.getBoundingClientRect()
    const rowMidY = rRect.top + rRect.height / 2 - containerRect.top
    const flexible = id.startsWith("header-")
    const naturalSide: "left" | "right" =
      info.markerX < containerCenter ? "left" : "right"
    items.push({ id, info, rowMidY, flexible, side: naturalSide })
  }

  // Sort by Y position
  items.sort((a, b) => a.rowMidY - b.rowMidY)

  // Step 1: Lock non-flexible items to their natural side
  // Step 2: Assign flexible items to whichever side has fewer cards
  const fixedItems = items.filter((i) => !i.flexible)
  const flexibleItems = items.filter((i) => i.flexible)

  let leftCount = fixedItems.filter((i) => i.side === "left").length
  let rightCount = fixedItems.filter((i) => i.side === "right").length

  // Sort flexible items by Y so we assign top-to-bottom
  flexibleItems.sort((a, b) => a.rowMidY - b.rowMidY)
  for (const item of flexibleItems) {
    if (leftCount <= rightCount) {
      item.side = "left"
      leftCount++
    } else {
      item.side = "right"
      rightCount++
    }
  }

  // Stack each side independently, avoiding overlap
  const leftItems = items
    .filter((i) => i.side === "left")
    .sort((a, b) => a.rowMidY - b.rowMidY)
  const rightItems = items
    .filter((i) => i.side === "right")
    .sort((a, b) => a.rowMidY - b.rowMidY)

  function stackSide(
    sideItems: typeof items
  ): CardPosition[] {
    const positions: CardPosition[] = []
    let prevBottom = -Infinity

    for (const item of sideItems) {
      const idealTop = Math.max(0, item.rowMidY - 30)
      const top = Math.max(idealTop, prevBottom + CARD_GAP)
      positions.push({ id: item.id, info: item.info, side: item.side, top })
      prevBottom = top + ESTIMATED_CARD_HEIGHT
    }

    return positions
  }

  return [...stackSide(leftItems), ...stackSide(rightItems)]
}

/* ═══════════════════════════════════════════════════
   DesktopCommentCards — renders ALL open cards
   ═══════════════════════════════════════════════════ */

export function DesktopCommentCards() {
  const { openAnnotations, close, getRowEl, containerEl, setCardSides } =
    useAnnotation()
  const [positions, setPositions] = useState<CardPosition[]>([])

  const recompute = useCallback(() => {
    if (!containerEl || openAnnotations.size === 0) {
      setPositions([])
      setCardSides(new Map())
      return
    }
    const computed = computeCardPositions(openAnnotations, getRowEl, containerEl)
    setPositions(computed)
    const sides = new Map<string, "left" | "right">()
    for (const pos of computed) sides.set(pos.id, pos.side)
    setCardSides(sides)
  }, [openAnnotations, getRowEl, containerEl, setCardSides])

  useEffect(() => {
    recompute()
  }, [recompute])

  // Reposition on scroll/resize
  useEffect(() => {
    if (openAnnotations.size === 0) return
    window.addEventListener("scroll", recompute, true)
    window.addEventListener("resize", recompute)
    return () => {
      window.removeEventListener("scroll", recompute, true)
      window.removeEventListener("resize", recompute)
    }
  }, [recompute, openAnnotations.size])

  if (positions.length === 0) return null

  return (
    <>
      {positions.map((pos) => {
        const style =
          pos.side === "left"
            ? {
                top: `${pos.top}px`,
                right: "calc(100% + 1.5rem)",
                width: CARD_WIDTH,
              }
            : {
                top: `${pos.top}px`,
                left: "calc(100% + 1.5rem)",
                width: CARD_WIDTH,
              }

        return (
          <aside
            key={pos.id}
            data-annotation-id={pos.id}
            className={`absolute hidden xl:block z-30 animate-in fade-in duration-200 ${
              pos.side === "left"
                ? "slide-in-from-left-2"
                : "slide-in-from-right-2"
            }`}
            style={style}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-lg border border-amber-300 bg-white shadow-lg dark:bg-zinc-900 dark:border-amber-700">
              <div className="h-0.5 bg-amber-500" />
              <div className="p-3">
                <CardBody info={pos.info} onClose={() => close(pos.id)} />
              </div>
            </div>
          </aside>
        )
      })}
    </>
  )
}

/* ═══════════════════════════════════════════════════
   MobileCommentSheet — shows last opened annotation
   ═══════════════════════════════════════════════════ */

export function MobileCommentSheet() {
  const { openAnnotations, lastOpenedId, close } = useAnnotation()

  const info = lastOpenedId ? openAnnotations.get(lastOpenedId) : undefined
  if (!info || !lastOpenedId) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end xl:hidden">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[3px] animate-in fade-in duration-200"
        onClick={() => close(lastOpenedId)}
      />
      <div
        className="relative bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background pt-3 pb-1 px-5 z-10">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="px-5 pb-8 pt-2">
          <CardBody info={info} onClose={() => close(lastOpenedId)} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   ConnectorLines — SVG elbow paths from each row
   edge to its card position
   ═══════════════════════════════════════════════════ */

interface LineData {
  id: string
  svgLeft: number
  svgTop: number
  svgWidth: number
  svgHeight: number
  d: string
}

export function ConnectorLines() {
  const { openAnnotations, getRowEl, containerEl, cardSides } = useAnnotation()
  const [lines, setLines] = useState<LineData[]>([])

  const measure = useCallback(() => {
    if (!containerEl || openAnnotations.size === 0) {
      setLines([])
      return
    }

    const pRect = containerEl.getBoundingClientRect()
    const result: LineData[] = []

    for (const [id] of openAnnotations) {
      const rowEl = getRowEl(id)
      if (!rowEl) continue

      const cardEl = containerEl.querySelector<HTMLElement>(
        `[data-annotation-id="${id}"]`
      )
      if (!cardEl) continue

      const rRect = rowEl.getBoundingClientRect()
      const cRect = cardEl.getBoundingClientRect()
      const side: "left" | "right" =
        cRect.right < rRect.left ? "left" : "right"

      const CORNER_R = 6
      const rowMidY = rRect.top + rRect.height / 2 - pRect.top
      const cardMidY = cRect.top + cRect.height / 2 - pRect.top

      if (side === "left") {
        const rowEdgeX = rRect.left - pRect.left
        const cardEdgeX = cRect.right - pRect.left

        const svgLeft = cardEdgeX
        const svgWidth = Math.max(1, rowEdgeX - cardEdgeX)
        const svgTop = Math.min(rowMidY, cardMidY) - 1
        const svgHeight = Math.abs(cardMidY - rowMidY) + 2

        const x1 = svgWidth
        const x2 = 0
        const y1 = rowMidY - svgTop
        const y2 = cardMidY - svgTop
        const dy = y2 - y1
        const absDy = Math.abs(dy)
        const r = Math.min(CORNER_R, absDy / 2, svgWidth / 2)

        let d: string
        if (absDy < 2) {
          d = `M${x1},${y1} L${x2},${y2}`
        } else {
          const midX = svgWidth / 2
          const signDy = dy > 0 ? 1 : -1
          d = `M${x1},${y1} L${midX + r},${y1} Q${midX},${y1} ${midX},${y1 + signDy * r} L${midX},${y2 - signDy * r} Q${midX},${y2} ${midX - r},${y2} L${x2},${y2}`
        }

        result.push({ id, svgLeft, svgTop, svgWidth, svgHeight, d })
      } else {
        const rowEdgeX = rRect.right - pRect.left
        const cardEdgeX = cRect.left - pRect.left

        const svgLeft = rowEdgeX
        const svgWidth = Math.max(1, cardEdgeX - rowEdgeX)
        const svgTop = Math.min(rowMidY, cardMidY) - 1
        const svgHeight = Math.abs(cardMidY - rowMidY) + 2

        const x1 = 0
        const x2 = svgWidth
        const y1 = rowMidY - svgTop
        const y2 = cardMidY - svgTop
        const dy = y2 - y1
        const absDy = Math.abs(dy)
        const r = Math.min(CORNER_R, absDy / 2, svgWidth / 2)

        let d: string
        if (absDy < 2) {
          d = `M${x1},${y1} L${x2},${y2}`
        } else {
          const midX = svgWidth / 2
          const signDy = dy > 0 ? 1 : -1
          d = `M${x1},${y1} L${midX - r},${y1} Q${midX},${y1} ${midX},${y1 + signDy * r} L${midX},${y2 - signDy * r} Q${midX},${y2} ${midX + r},${y2} L${x2},${y2}`
        }

        result.push({ id, svgLeft, svgTop, svgWidth, svgHeight, d })
      }
    }

    setLines(result)
  }, [openAnnotations, getRowEl, containerEl])

  // Re-measure when cardSides changes (cards have been positioned)
  // Use double rAF to ensure cards are painted before measuring
  useEffect(() => {
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(measure)
    })
    return () => cancelAnimationFrame(outer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, cardSides])

  useEffect(() => {
    if (openAnnotations.size === 0) return
    window.addEventListener("scroll", measure, true)
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("scroll", measure, true)
      window.removeEventListener("resize", measure)
    }
  }, [measure, openAnnotations.size])

  if (lines.length === 0) return null

  return (
    <>
      {lines.map((line) => (
        <svg
          key={line.id}
          className="pointer-events-none absolute hidden xl:block"
          style={{
            left: `${line.svgLeft}px`,
            top: `${line.svgTop}px`,
            width: `${line.svgWidth}px`,
            height: `${line.svgHeight}px`,
            zIndex: 25,
            overflow: "visible",
          }}
        >
          <path
            d={line.d}
            fill="none"
            stroke="rgb(245, 158, 11)"
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </>
  )
}
