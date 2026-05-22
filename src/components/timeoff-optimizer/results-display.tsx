"use client"

import * as React from "react"
import { AlertTriangle, CalendarDays, Check, Copy, Download, ListChecks, Sparkles } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
} from "@/components/ui/tabs"
import { HapticButton, HapticTabsTrigger as TabsTrigger } from "@/components/haptic-wrappers"
import { CalendarView } from "./calendar-view"
import { BreakCard } from "./break-card"
import { breaksToICS, downloadICS } from "@/lib/timeoff-optimizer/ics"
import type { PlanResult } from "@/lib/timeoff-optimizer/types"

interface ResultsDisplayProps {
  result: PlanResult
  year: number
  ptoBudget: number
  shareUrl: string
  isStale?: boolean
}

export function ResultsDisplay({
  result,
  year,
  ptoBudget,
  shareUrl,
  isStale,
}: ResultsDisplayProps) {
  const [copied, setCopied] = React.useState(false)
  const { breaks, stats, days } = result
  const efficiency =
    stats.totalDayOffs > 0 ? (stats.totalDaysOff / stats.totalDayOffs).toFixed(2) : "0"

  const handleExport = () => {
    const ics = breaksToICS(breaks, `Time off ${year}`)
    downloadICS(`timeoff-${year}.ics`, ics)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 px-4">
        {isStale && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-dashed border-primary/50 bg-primary/10 px-3 py-2.5 text-xs font-medium text-foreground"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-foreground">Inputs changed since this plan was generated.</p>
              <p className="text-muted-foreground">
                Click <span className="font-semibold text-foreground">Optimize my time off</span> to refresh.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Your optimized {year} plan</h2>
            <p className="text-xs text-muted-foreground">
              {breaks.length} break{breaks.length === 1 ? "" : "s"} · {stats.totalDaysOff} days off ·{" "}
              {stats.totalDayOffs}/{ptoBudget} PTO used
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HapticButton variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copied!" : "Share link"}
            </HapticButton>
            <HapticButton variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-3" />
              Export .ics
            </HapticButton>
          </div>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">
              <CalendarDays className="size-3" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="breaks">
              <ListChecks className="size-3" /> Breaks
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Sparkles className="size-3" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="pt-4">
            <CalendarView days={days} year={year} />
          </TabsContent>

          <TabsContent value="breaks" className="pt-4">
            {breaks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No breaks generated. Try a different strategy or add more PTO days.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {breaks.map((br, idx) => (
                  <BreakCard key={`${br.startDate}-${idx}`} break={br} index={idx} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Total days off" value={stats.totalDaysOff} accent="text-primary" />
              <StatTile label="PTO used" value={`${stats.totalDayOffs} / ${ptoBudget}`} />
              <StatTile
                label="Efficiency"
                value={`${efficiency}x`}
                hint="Days off per PTO day"
                accent="text-primary"
              />
              <StatTile
                label="Public holidays"
                value={stats.totalHolidays}
                accent="text-accent-green"
              />
              <StatTile label="Weekend days" value={stats.totalWeekendDays} />
              <StatTile
                label="Company days off"
                value={stats.totalCustomDays}
                accent="text-accent-blue"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface StatTileProps {
  label: string
  value: number | string
  hint?: string
  accent?: string
}

function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
