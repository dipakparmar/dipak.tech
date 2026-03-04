"use client"

import { useRef, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useAnnotation } from "./annotation-provider"
import type { AnnotationInfo } from "@/lib/header-annotations"
import { X, MessageSquareText } from "lucide-react"

/* ─── CommentMarker ─── */

interface CommentMarkerProps {
  id: string
  info: AnnotationInfo
}

export function CommentMarker({ id, info }: CommentMarkerProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const { activeAnnotation, activate, setMarkerEl } = useAnnotation()
  const isActive = activeAnnotation?.id === id

  useEffect(() => {
    if (isActive && btnRef.current) {
      setMarkerEl(btnRef.current)
    }
    if (!isActive) {
      // Only clear if this marker was the one that set it
    }
  }, [isActive, setMarkerEl])

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={`Annotation: ${info.title}`}
      onClick={(e) => {
        e.stopPropagation()
        if (isActive) {
          activate(null)
          return
        }
        const rect = btnRef.current!.getBoundingClientRect()
        activate({
          id,
          ...info,
          viewportY: rect.top + rect.height / 2,
        })
      }}
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all select-none cursor-pointer border ${
        isActive
          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40"
      }`}
    >
      <MessageSquareText className="h-2.5 w-2.5" />
      <span>?</span>
    </button>
  )
}

/* ─── DesktopCommentCard ─── */

export function DesktopCommentCard() {
  const { activeAnnotation, activate, setCardEl } = useAnnotation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [topPx, setTopPx] = useState(0)

  useEffect(() => {
    if (!activeAnnotation) return
    // Position relative to container: use viewport Y - container top
    const container = cardRef.current?.parentElement
    if (container) {
      const containerRect = container.getBoundingClientRect()
      setTopPx(Math.max(0, activeAnnotation.viewportY - containerRect.top - 30))
    }
  }, [activeAnnotation])

  // Clamp to viewport
  useEffect(() => {
    if (!cardRef.current || !activeAnnotation) return
    const rect = cardRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    if (rect.bottom > vh - 16) {
      setTopPx((p) => Math.max(0, p - (rect.bottom - vh + 24)))
    }
    if (rect.top < 60) {
      setTopPx(60)
    }
  }, [activeAnnotation])

  useEffect(() => {
    if (cardRef.current) setCardEl(cardRef.current)
    return () => setCardEl(null)
  }, [activeAnnotation?.id, setCardEl])

  if (!activeAnnotation) return null

  return (
    <aside
      ref={cardRef}
      className="absolute hidden xl:block z-30 animate-in fade-in slide-in-from-right-2 duration-200"
      style={{
        top: `${topPx}px`,
        left: "calc(100% + 1.5rem)",
        width: "280px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="overflow-hidden rounded-lg border border-amber-300 bg-white shadow-lg dark:bg-zinc-900 dark:border-amber-700">
        {/* Top accent bar */}
        <div className="h-0.5 bg-amber-500" />
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <MessageSquareText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground leading-tight">
                {activeAnnotation.title}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                annotation
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                activate(null)
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close annotation"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* What */}
          <div className="mt-2 pt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 font-mono mb-0.5">
              What this means
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {activeAnnotation.description}
            </p>
          </div>

          {/* Why */}
          {activeAnnotation.why && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 font-mono mb-0.5">
                Why it matters
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {activeAnnotation.why}
              </p>
            </div>
          )}

          {/* How */}
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-mono mb-0.5">
              How to read
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {activeAnnotation.howToRead}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ─── MobileCommentSheet ─── */

export function MobileCommentSheet() {
  const { activeAnnotation, activate } = useAnnotation()

  if (!activeAnnotation) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end xl:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[3px] animate-in fade-in duration-200"
        onClick={() => activate(null)}
      />
      {/* Sheet */}
      <div
        className="relative bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="sticky top-0 bg-background pt-3 pb-1 px-5 z-10">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="px-5 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <MessageSquareText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{activeAnnotation.title}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                annotation
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                activate(null)
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* What */}
          <div className="mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 font-mono mb-0.5">
              What this means
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeAnnotation.description}
            </p>
          </div>

          {/* Why */}
          {activeAnnotation.why && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 font-mono mb-0.5">
                Why it matters
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {activeAnnotation.why}
              </p>
            </div>
          )}

          {/* How */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-mono mb-0.5">
              How to read
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeAnnotation.howToRead}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── ConnectorLine ─── */

export function ConnectorLine() {
  const { markerEl, cardEl, containerEl } = useAnnotation()
  const [style, setStyle] = useState<React.CSSProperties | null>(null)

  useEffect(() => {
    if (!markerEl || !cardEl || !containerEl) {
      setStyle(null)
      return
    }

    function measure() {
      const mRect = markerEl!.getBoundingClientRect()
      const cRect = cardEl!.getBoundingClientRect()
      const pRect = containerEl!.getBoundingClientRect()

      const startX = mRect.right - pRect.left
      const endX = cRect.left - pRect.left
      const startY = mRect.top + mRect.height / 2 - pRect.top
      const lineWidth = Math.max(4, endX - startX)

      setStyle({
        position: "absolute",
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${lineWidth}px`,
        height: "0px",
        borderTop: "1.5px solid rgb(245, 158, 11)",
        pointerEvents: "none",
        zIndex: 25,
      })
    }

    measure()
    window.addEventListener("scroll", measure, true)
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("scroll", measure, true)
      window.removeEventListener("resize", measure)
    }
  }, [markerEl, cardEl, containerEl])

  if (!style) return null
  return <div className="hidden xl:block" style={style} />
}

/* ─── AnnotatedRow ─── */

interface AnnotatedRowProps {
  id: string
  children: ReactNode
  className?: string
}

export function AnnotatedRow({ id, children, className = "" }: AnnotatedRowProps) {
  const { activeAnnotation } = useAnnotation()
  const isActive = activeAnnotation?.id === id

  return (
    <div
      className={`relative transition-all duration-200 ${
        isActive
          ? "bg-amber-50 dark:bg-amber-950/20 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-amber-500 before:rounded-r"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}
