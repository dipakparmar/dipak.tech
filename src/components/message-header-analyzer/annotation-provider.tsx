"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react"
import type { ReactNode } from "react"
import type { AnnotationInfo } from "@/lib/header-annotations"

export interface OpenAnnotationData extends AnnotationInfo {
  markerX: number
}

interface AnnotationContextType {
  openAnnotations: Map<string, OpenAnnotationData>
  lastOpenedId: string | null
  toggle: (id: string, info: AnnotationInfo, markerX: number) => void
  close: (id: string) => void
  closeAll: () => void
  registerRow: (id: string, el: HTMLElement | null) => void
  getRowEl: (id: string) => HTMLElement | undefined
  containerEl: HTMLElement | null
  setContainerEl: (el: HTMLElement | null) => void
  cardSides: Map<string, "left" | "right">
  setCardSides: (sides: Map<string, "left" | "right">) => void
}

const AnnotationContext = createContext<AnnotationContextType | null>(null)

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [openAnnotations, setOpenAnnotations] = useState<
    Map<string, OpenAnnotationData>
  >(new Map())
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null)
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)
  const [cardSides, setCardSides] = useState<Map<string, "left" | "right">>(
    new Map()
  )
  const rowRefs = useRef(new Map<string, HTMLElement>())

  const toggle = useCallback(
    (id: string, info: AnnotationInfo, markerX: number) => {
      setOpenAnnotations((prev) => {
        const next = new Map(prev)
        if (next.has(id)) {
          next.delete(id)
          setLastOpenedId(null)
        } else {
          next.set(id, { ...info, markerX })
          setLastOpenedId(id)
        }
        return next
      })
    },
    []
  )

  const close = useCallback((id: string) => {
    setOpenAnnotations((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setLastOpenedId((prev) => (prev === id ? null : prev))
  }, [])

  const closeAll = useCallback(() => {
    setOpenAnnotations(new Map())
    setLastOpenedId(null)
  }, [])

  const registerRow = useCallback((id: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el)
    else rowRefs.current.delete(id)
  }, [])

  const getRowEl = useCallback((id: string) => {
    return rowRefs.current.get(id)
  }, [])

  // Close all on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openAnnotations.size > 0) {
        closeAll()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [openAnnotations.size, closeAll])

  return (
    <AnnotationContext.Provider
      value={{
        openAnnotations,
        lastOpenedId,
        toggle,
        close,
        closeAll,
        registerRow,
        getRowEl,
        containerEl,
        setContainerEl,
        cardSides,
        setCardSides,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  )
}

export function useAnnotation() {
  const ctx = useContext(AnnotationContext)
  if (!ctx)
    throw new Error("useAnnotation must be used within AnnotationProvider")
  return ctx
}
