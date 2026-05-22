import { addDays, format, parseISO } from "date-fns"

import type { OffBlock } from "./types"

const escapeICS = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

const stamp = () => format(new Date(), "yyyyMMdd'T'HHmmss'Z'")
const dateOnly = (iso: string) => format(parseISO(iso), "yyyyMMdd")

export function breaksToICS(breaks: OffBlock[], calendarName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tools.dipak.io//Time-off Optimizer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
  ]

  const now = stamp()

  breaks.forEach((br, idx) => {
    const summaryParts = [`Time off (${br.totalDays} day${br.totalDays === 1 ? "" : "s"})`]
    if (br.dayOffCount > 0) summaryParts.push(`${br.dayOffCount} PTO`)
    const summary = summaryParts.join(" · ")

    const descParts: string[] = []
    descParts.push(`Total days: ${br.totalDays}`)
    descParts.push(`PTO days: ${br.dayOffCount}`)
    if (br.holidayCount > 0) descParts.push(`Public holidays: ${br.holidayCount}`)
    if (br.weekendCount > 0) descParts.push(`Weekends: ${br.weekendCount}`)
    if (br.customDayCount > 0) descParts.push(`Company days off: ${br.customDayCount}`)

    const namedDays = br.days
      .filter((d) => d.holidayName || d.customDayName)
      .map(
        (d) => `${d.date}: ${d.holidayName ?? d.customDayName}`
      )
    if (namedDays.length > 0) {
      descParts.push("")
      descParts.push("Includes:")
      descParts.push(...namedDays)
    }

    const uid = `timeoff-${br.startDate}-${idx}@dipak.tech`
    const dtend = format(addDays(parseISO(br.endDate), 1), "yyyyMMdd")

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateOnly(br.startDate)}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(descParts.join("\n"))}`,
      "TRANSP:OPAQUE",
      "END:VEVENT"
    )
  })

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function downloadICS(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
