"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import type { AnnotationInfo } from "@/lib/header-annotations"

export interface ActiveAnnotation extends AnnotationInfo {
  id: string
  viewportY: number
}

interface AnnotationContextType {
  activeAnnotation: ActiveAnnotation | null
  activate: (annotation: ActiveAnnotation | null) => void
  markerEl: HTMLElement | null
  setMarkerEl: (el: HTMLElement | null) => void
  cardEl: HTMLElement | null
  setCardEl: (el: HTMLElement | null) => void
  containerEl: HTMLElement | null
  setContainerEl: (el: HTMLElement | null) => void
}

const AnnotationContext = createContext<AnnotationContextType | null>(null)

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [activeAnnotation, setActiveAnnotation] = useState<ActiveAnnotation | null>(null)
  const [markerEl, setMarkerEl] = useState<HTMLElement | null>(null)
  const [cardEl, setCardEl] = useState<HTMLElement | null>(null)
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)

  const activate = useCallback((annotation: ActiveAnnotation | null) => {
    setActiveAnnotation(annotation)
    if (!annotation) {
      setMarkerEl(null)
      setCardEl(null)
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && activeAnnotation) {
        activate(null)
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [activeAnnotation, activate])

  return (
    <AnnotationContext.Provider
      value={{
        activeAnnotation,
        activate,
        markerEl,
        setMarkerEl,
        cardEl,
        setCardEl,
        containerEl,
        setContainerEl,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  )
}

export function useAnnotation() {
  const ctx = useContext(AnnotationContext)
  if (!ctx) throw new Error("useAnnotation must be used within AnnotationProvider")
  return ctx
}
