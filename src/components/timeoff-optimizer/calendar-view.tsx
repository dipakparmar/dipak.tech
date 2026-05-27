"use client"

import * as React from "react"
import { format, getDay, getDaysInMonth, parseISO } from "date-fns"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DayPlan } from "@/lib/timeoff-optimizer/types"

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

interface CalendarViewProps {
  days: DayPlan[]
  year: number
}

interface MonthGrid {
  monthIndex: number
  label: string
  cells: Array<DayPlan | null>
}

function groupByMonth(days: DayPlan[], year: number): MonthGrid[] {
  const byMonth = new Map<number, DayPlan[]>()
  for (const d of days) {
    const date = parseISO(d.date)
    const m = date.getMonth()
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m)!.push(d)
  }

  return Array.from(byMonth.keys())
    .sort((a, b) => a - b)
    .map<MonthGrid>((monthIndex) => {
      const ref = new Date(year, monthIndex, 1)
      const daysInMonth = getDaysInMonth(ref)
      const firstWeekday = getDay(ref)
      const monthDays = byMonth.get(monthIndex)!
      const lookup = new Map<number, DayPlan>()
      for (const d of monthDays) {
        const dayNum = parseISO(d.date).getDate()
        lookup.set(dayNum, d)
      }

      const cells: Array<DayPlan | null> = []
      for (let i = 0; i < firstWeekday; i++) cells.push(null)
      for (let day = 1; day <= daysInMonth; day++) {
        cells.push(lookup.get(day) ?? null)
      }
      while (cells.length % 7 !== 0) cells.push(null)

      return { monthIndex, label: format(ref, "MMMM yyyy"), cells }
    })
}

function dayStyles(day: DayPlan): { className: string; label?: string } {
  if (day.isAlreadyTaken) {
    const cost = day.takenPtoCost ?? 1
    const costLabel = cost < 1 ? ` (${cost * 8}h)` : ""
    return {
      className: cn(
        "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        day.inOffBlock && "ring-1 ring-primary/50"
      ),
      label: (day.takenName ?? "Already taken") + costLabel,
    }
  }
  if (day.isDayOff) {
    return {
      className: "bg-primary text-primary-foreground ring-1 ring-primary/40",
      label: "PTO day",
    }
  }
  if (day.isPublicHoliday) {
    return {
      className: cn(
        "bg-accent-green/15 text-accent-green",
        day.inOffBlock && "ring-1 ring-primary/50"
      ),
      label: day.holidayName ?? "Public holiday",
    }
  }
  if (day.isCustomDayOff) {
    return {
      className: cn(
        "bg-accent-blue/15 text-accent-blue",
        day.inOffBlock && "ring-1 ring-primary/50"
      ),
      label: day.customDayName ?? "Company day off",
    }
  }
  if (day.isWeekend) {
    return {
      className: cn(
        "bg-muted text-muted-foreground",
        day.inOffBlock && "ring-1 ring-primary/50"
      ),
      label: "Weekend",
    }
  }
  return { className: "text-foreground/70 hover:bg-muted/60" }
}

export function CalendarView({ days, year }: CalendarViewProps) {
  const months = React.useMemo(() => groupByMonth(days, year), [days, year])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <Legend swatch="bg-primary" label="PTO day" />
        <Legend swatch="bg-amber-500/30" label="Already taken" />
        <Legend swatch="bg-accent-green/40" label="Public holiday" />
        <Legend swatch="bg-accent-blue/40" label="Company day off" />
        <Legend swatch="bg-muted" label="Weekend" />
        <Legend swatch="ring-1 ring-primary/50 bg-transparent" label="Part of break" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {months.map((month) => (
          <div key={month.monthIndex} className="space-y-2">
            <h3 className="text-sm font-medium">{month.label}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {WEEKDAY_LABELS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {month.cells.map((day, idx) => {
                if (!day) return <span key={idx} className="aspect-square" aria-hidden />
                const { className, label } = dayStyles(day)
                const dayNum = parseISO(day.date).getDate()
                const tooltipParts = [format(parseISO(day.date), "EEE, MMM d")]
                if (label) tooltipParts.push(label)
                if (day.inOffBlock && !day.isDayOff) {
                  tooltipParts.push("Part of optimized break")
                }
                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors",
                          className
                        )}
                      >
                        {dayNum}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{tooltipParts.join(" · ")}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-3 rounded-sm", swatch)} aria-hidden />
      <span>{label}</span>
    </span>
  )
}
