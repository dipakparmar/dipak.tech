"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Route } from "lucide-react"
import type { Hop } from "@/lib/email-header-parser"
import { formatDelay } from "@/lib/email-header-parser"
import { CommentMarker, AnnotatedRow } from "./annotation-components"
import { getHeaderAnnotation, getCardAnnotation } from "@/lib/header-annotations"

interface RoutingTimelineProps {
  hops: Hop[]
  totalDeliveryTime: number | null
}

function getDelayColor(ms: number): string {
  const abs = Math.abs(ms)
  if (abs < 5000) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  if (abs < 30000) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
}

function getSlowestHopIndex(hops: Hop[]): number {
  let maxDelay = -1
  let maxIndex = -1
  for (const hop of hops) {
    if (hop.delay !== null && hop.delay > maxDelay) {
      maxDelay = hop.delay
      maxIndex = hop.index
    }
  }
  return maxIndex
}

export function RoutingTimeline({ hops, totalDeliveryTime }: RoutingTimelineProps) {
  const slowestIndex = getSlowestHopIndex(hops)
  const receivedInfo = getHeaderAnnotation("received")
  const hopsCardInfo = getCardAnnotation("received-hops")

  if (hops.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No routing hops found in headers.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <AnnotatedRow id="routing-hops-info">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Route className="h-4 w-4 text-primary" />
              </div>
              Routing Timeline
              {hopsCardInfo && (
                <CommentMarker id="routing-hops-info" info={hopsCardInfo} />
              )}
            </CardTitle>
            {totalDeliveryTime !== null && (
              <Badge variant="outline" className="gap-1.5 font-mono">
                <Clock className="h-3 w-3" />
                Total: {formatDelay(totalDeliveryTime)}
              </Badge>
            )}
          </div>
        </AnnotatedRow>
      </CardHeader>
      <CardContent>
        <div className="relative ml-3">
          {/* Vertical timeline line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-0">
            {hops.map((hop) => {
              const isSlowest = hop.index === slowestIndex
              return (
                <AnnotatedRow key={hop.index} id={`hop-${hop.index}`}>
                  {/* Delay badge between hops */}
                  {hop.delay !== null && (
                    <div className="relative flex items-center py-1.5 pl-6">
                      <div className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 border-t border-dashed border-muted-foreground/30" />
                      <Badge className={`font-mono text-[0.625rem] ${getDelayColor(hop.delay)}`}>
                        +{formatDelay(hop.delay)}
                      </Badge>
                    </div>
                  )}

                  {/* Hop node */}
                  <div
                    className={`relative flex items-start gap-4 rounded-lg py-2.5 pl-6 pr-3 transition-colors ${
                      isSlowest
                        ? "bg-red-500/5 ring-1 ring-red-500/20 rounded-md ml-1 -mr-1"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Dot on timeline */}
                    <div
                      className={`absolute left-0 top-3.5 -translate-x-1/2 rounded-full border-2 ${
                        isSlowest
                          ? "h-3 w-3 border-red-500 bg-red-500/30"
                          : "h-2.5 w-2.5 border-primary bg-background"
                      }`}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[0.6875rem] font-medium text-muted-foreground">
                          Hop {hop.index + 1}
                        </span>
                        {hop.index === 0 && (
                          <CommentMarker id={`hop-${hop.index}`} info={receivedInfo} />
                        )}
                        {isSlowest && (
                          <Badge variant="destructive" className="text-[0.5625rem]">
                            Slowest
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        {hop.from && (
                          <div className="flex items-baseline gap-1.5 text-xs">
                            <span className="shrink-0 text-muted-foreground">from</span>
                            <span className="font-mono font-medium break-all">{hop.from}</span>
                          </div>
                        )}
                        {hop.by && (
                          <div className="flex items-baseline gap-1.5 text-xs">
                            <span className="shrink-0 text-muted-foreground">by</span>
                            <span className="font-mono font-medium break-all">{hop.by}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-0.5">
                        {hop.with && (
                          <Badge variant="secondary" className="font-mono">
                            {hop.with}
                          </Badge>
                        )}
                        {hop.timestamp && (
                          <span className="text-[0.6875rem] text-muted-foreground font-mono">
                            {hop.timestamp.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AnnotatedRow>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
