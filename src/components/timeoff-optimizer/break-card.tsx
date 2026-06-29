"use client"

import { format, parseISO } from "date-fns"
import { CalendarDays, CalendarHeart, CalendarPlus, Sparkles, Briefcase, History } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HapticButton } from "@/components/haptic-wrappers"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { breakToICS, downloadICS } from "@/lib/timeoff-optimizer/ics"
import { googleCalendarUrl, office365Url, outlookComUrl } from "@/lib/timeoff-optimizer/calendar-links"
import type { OffBlock } from "@/lib/timeoff-optimizer/types"

interface BreakCardProps {
  break: OffBlock
  index: number
  titleTemplate?: string
  notesTemplate?: string
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

export function BreakCard({ break: br, index, titleTemplate, notesTemplate }: BreakCardProps) {
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <HapticButton variant="outline" size="icon" className="size-7" aria-label="Add to calendar">
                      <CalendarPlus className="size-3.5" />
                    </HapticButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Add to calendar</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={googleCalendarUrl(br, titleTemplate, notesTemplate)} target="_blank" rel="noopener noreferrer">
                    Google Calendar
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={outlookComUrl(br, titleTemplate, notesTemplate)} target="_blank" rel="noopener noreferrer">
                    Outlook.com
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={office365Url(br, titleTemplate, notesTemplate)} target="_blank" rel="noopener noreferrer">
                    Office 365
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    downloadICS(
                      `timeoff-break-${index + 1}.ics`,
                      breakToICS(br, titleTemplate, notesTemplate)
                    )
                  }
                >
                  Download .ics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="rounded-md bg-primary/10 px-2 py-1 text-center">
              <p className="text-base font-semibold leading-none text-primary">{br.totalDays}</p>
              <p className="text-[9px] uppercase text-muted-foreground">days off</p>
            </div>
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
          {br.alreadyTakenCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <History className="size-3 text-amber-500" />
              {br.alreadyTakenCount} already taken
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
