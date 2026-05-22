"use client"

import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { CalendarDays, CalendarHeart, Sparkles, Briefcase } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { OffBlock } from "@/lib/timeoff-optimizer/types"

interface BreakCardProps {
  break: OffBlock
  index: number
}

function fmtRange(start: string, end: string) {
  const s = parseISO(start)
  const e = parseISO(end)
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, "MMM d")} to ${format(e, "d, yyyy")}`
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, "MMM d")} to ${format(e, "MMM d, yyyy")}`
  }
  return `${format(s, "MMM d, yyyy")} to ${format(e, "MMM d, yyyy")}`
}

export function BreakCard({ break: br, index }: BreakCardProps) {
  const totalDays = differenceInCalendarDays(parseISO(br.endDate), parseISO(br.startDate)) + 1
  const dayOffDays = br.days.filter((d) => d.isDayOff)
  const namedDays = br.days.filter((d) => d.holidayName || d.customDayName)

  return (
    <Card size="sm" className="ring-primary/10 hover:ring-primary/30 transition-shadow">
      <CardContent className="space-y-2 px-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
              Break {index + 1}
            </p>
            <p className="text-sm font-semibold">{fmtRange(br.startDate, br.endDate)}</p>
          </div>
          <div className="rounded-md bg-primary/10 px-2 py-1 text-center">
            <p className="text-base font-semibold leading-none text-primary">{totalDays}</p>
            <p className="text-[9px] uppercase text-muted-foreground">days off</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarHeart className="size-3 text-primary" />
            {br.dayOffCount} PTO
          </span>
          {br.holidayCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3 text-accent-green" />
              {br.holidayCount} holiday{br.holidayCount === 1 ? "" : "s"}
            </span>
          )}
          {br.weekendCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {br.weekendCount} weekend day{br.weekendCount === 1 ? "" : "s"}
            </span>
          )}
          {br.customDayCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3 text-accent-blue" />
              {br.customDayCount} company day{br.customDayCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {dayOffDays.length > 0 && (
          <div className="border-t border-border/60 pt-2">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Take PTO on
            </p>
            <div className="flex flex-wrap gap-1">
              {dayOffDays.map((d) => (
                <span
                  key={d.date}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary tabular-nums"
                >
                  <CalendarHeart className="size-3" />
                  {format(parseISO(d.date), "EEE, MMM d")}
                </span>
              ))}
            </div>
          </div>
        )}

        {namedDays.length > 0 && (
          <div className="border-t border-border/60 pt-2">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Includes
            </p>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground">
              {namedDays.map((d) => (
                <li key={d.date} className="flex justify-between gap-2">
                  <span className="inline-flex items-center gap-1">
                    {d.holidayName ? (
                      <Sparkles className="size-3 text-accent-green" />
                    ) : (
                      <Briefcase className="size-3 text-accent-blue" />
                    )}
                    {d.holidayName ?? d.customDayName}
                  </span>
                  <span className="tabular-nums">{format(parseISO(d.date), "MMM d")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
