"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { HapticButton as Button } from "@/components/haptic-wrappers"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  parseEmailHeaders,
  formatDelay,
  SAMPLE_HEADERS,
} from "@/lib/email-header-parser"
import type { ParsedHeaders } from "@/lib/email-header-parser"
import { SummaryCard } from "./summary-card"
import { RoutingTimeline } from "./routing-timeline"
import { AuthResults } from "./auth-results"
import { HeaderTable } from "./header-table"
import { MessageViewer } from "./message-viewer"
import { AnnotationProvider, useAnnotation } from "./annotation-provider"
import { DesktopCommentCards, MobileCommentSheet, ConnectorLines } from "./annotation-components"
import { FileText, AlertCircle, Clipboard, Trash2, ChevronDown, Share2, Check } from "lucide-react"
import { useHaptics } from "@/hooks/use-haptics"

function encodeHeaders(raw: string): string {
  const bytes = new TextEncoder().encode(raw)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function decodeHeaders(encoded: string): string | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function HeaderAnalyzerInner() {
  const [rawHeaders, setRawHeaders] = useState("")
  const [parsed, setParsed] = useState<ParsedHeaders | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const { trigger: hapticTrigger } = useHaptics()
  const containerRef = useRef<HTMLDivElement>(null)
  const { setContainerEl } = useAnnotation()

  // Set container ref for connector line positioning
  useEffect(() => {
    if (containerRef.current) setContainerEl(containerRef.current)
    return () => setContainerEl(null)
  }, [parsed, setContainerEl])

  // Load headers from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    const decoded = decodeHeaders(hash)
    if (!decoded) return

    setRawHeaders(decoded)
    const result = parseEmailHeaders(decoded)
    if (result.headers.length > 0) {
      setParsed(result)
      setCollapsed(true)
    }
  }, [])

  const updateHash = useCallback((raw: string) => {
    const encoded = encodeHeaders(raw)
    window.history.replaceState(null, "", `#${encoded}`)
  }, [])

  const handleAnalyze = () => {
    if (!rawHeaders.trim()) {
      setError("Please paste email headers to analyze.")
      hapticTrigger("error")
      return
    }

    const result = parseEmailHeaders(rawHeaders)

    if (result.headers.length === 0) {
      setError("Could not parse any valid headers from the input. Make sure you are pasting raw email headers.")
      hapticTrigger("error")
      return
    }

    setError(null)
    setParsed(result)
    setCollapsed(true)
    updateHash(rawHeaders)
    hapticTrigger("success")
  }

  const handlePasteSample = () => {
    setRawHeaders(SAMPLE_HEADERS)
    hapticTrigger("light")
  }

  const handleClear = () => {
    setRawHeaders("")
    setParsed(null)
    setError(null)
    setCollapsed(false)
    window.history.replaceState(null, "", window.location.pathname)
    hapticTrigger("light")
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    hapticTrigger("success")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Input section */}
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          {collapsed && parsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">
                Input Headers ({parsed.headers.length} headers parsed)
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : (
            <CardContent className="space-y-4 pt-4">
              <Textarea
                rows={12}
                value={rawHeaders}
                onChange={(e) => setRawHeaders(e.target.value)}
                placeholder={`Paste raw email headers or full email source here...\n\nTo get the source:\n- Gmail: Open email > "..." menu > "Show original"\n- Outlook: Open email > File > Properties > "Internet headers"\n- Apple Mail: View > Message > Raw Source\n\nSupports headers-only or full email with body.`}
                className="font-mono text-xs resize-y min-h-[200px]"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleAnalyze} size="sm" className="gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Analyze Headers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteSample}
                  className="gap-2"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Paste Sample
                </Button>
                {(parsed || rawHeaders) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Results section - stacked for print-friendliness */}
      {parsed && (
        <div
          ref={containerRef}
          className="relative mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6"
        >
          {/* Share button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Link copied!
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </>
              )}
            </Button>
          </div>

          {parsed.body && (
            <MessageViewer
              summary={parsed.summary}
              body={parsed.body}
            />
          )}

          <SummaryCard
            summary={parsed.summary}
            authentication={parsed.authentication}
            totalDeliveryTime={parsed.totalDeliveryTime}
            formatDelay={formatDelay}
          />

          <RoutingTimeline
            hops={parsed.hops}
            totalDeliveryTime={parsed.totalDeliveryTime}
          />

          <AuthResults authentication={parsed.authentication} />

          <HeaderTable headers={parsed.headers} />

          {/* Desktop annotation cards + connectors */}
          <DesktopCommentCards />
          <ConnectorLines />

          {/* Mobile annotation sheet */}
          <MobileCommentSheet />
        </div>
      )}
    </div>
  )
}

export function HeaderAnalyzer() {
  return (
    <AnnotationProvider>
      <HeaderAnalyzerInner />
    </AnnotationProvider>
  )
}
