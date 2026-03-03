"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { HapticTabsTrigger as TabsTrigger } from "@/components/haptic-wrappers"
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
import { FileText, Route, ShieldCheck, Table as TableIcon, AlertCircle, Clipboard, Trash2 } from "lucide-react"
import { useHaptics } from "@/hooks/use-haptics"

export function HeaderAnalyzer() {
  const [rawHeaders, setRawHeaders] = useState("")
  const [parsed, setParsed] = useState<ParsedHeaders | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { trigger: hapticTrigger } = useHaptics()

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
    hapticTrigger("light")
  }

  return (
    <div className="space-y-8">
      {/* Input section */}
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-4">
            <Textarea
              rows={12}
              value={rawHeaders}
              onChange={(e) => setRawHeaders(e.target.value)}
              placeholder={`Paste raw email headers here...\n\nTo get headers:\n- Gmail: Open email > "..." menu > "Show original"\n- Outlook: Open email > File > Properties > "Internet headers"\n- Apple Mail: View > Message > All Headers`}
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
        </Card>

        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Results section */}
      {parsed && (
        <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="routing" className="gap-1.5">
                <Route className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Routing</span>
              </TabsTrigger>
              <TabsTrigger value="auth" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Auth</span>
              </TabsTrigger>
              <TabsTrigger value="headers" className="gap-1.5">
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Headers</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <SummaryCard
                summary={parsed.summary}
                authentication={parsed.authentication}
                totalDeliveryTime={parsed.totalDeliveryTime}
                formatDelay={formatDelay}
              />
            </TabsContent>

            <TabsContent value="routing" className="mt-4">
              <RoutingTimeline
                hops={parsed.hops}
                totalDeliveryTime={parsed.totalDeliveryTime}
              />
            </TabsContent>

            <TabsContent value="auth" className="mt-4">
              <AuthResults authentication={parsed.authentication} />
            </TabsContent>

            <TabsContent value="headers" className="mt-4">
              <HeaderTable headers={parsed.headers} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
