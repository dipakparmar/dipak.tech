import { addDays, format, parseISO } from "date-fns"

import type { OffBlock } from "./types"

const escapeICS = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

const stamp = () => format(new Date(), "yyyyMMdd'T'HHmmss'Z'")
const dateOnly = (iso: string) => format(parseISO(iso), "yyyyMMdd")

/** Tokens available in custom title/notes templates, e.g. "{days} days off". */
function buildTokens(br: OffBlock): Record<string, string> {
  const names = br.days
    .filter((d) => d.holidayName || d.customDayName)
    .map((d) => d.holidayName ?? d.customDayName ?? "")
  return {
    days: String(br.totalDays),
    pto: String(br.dayOffCount),
    holidays: String(br.holidayCount),
    weekends: String(br.weekendCount),
    company: String(br.customDayCount),
    start: format(parseISO(br.startDate), "MMM d"),
    end: format(parseISO(br.endDate), "MMM d"),
    year: format(parseISO(br.startDate), "yyyy"),
    names: names.join(", "),
  }
}

function applyTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? "")
}

function defaultSummary(br: OffBlock): string {
  const parts = [`Time off (${br.totalDays} day${br.totalDays === 1 ? "" : "s"})`]
  if (br.dayOffCount > 0) parts.push(`${br.dayOffCount} PTO`)
  return parts.join(" · ")
}

function defaultDescription(br: OffBlock): string {
  const parts: string[] = [`Total days: ${br.totalDays}`, `PTO days: ${br.dayOffCount}`]
  if (br.holidayCount > 0) parts.push(`Public holidays: ${br.holidayCount}`)
  if (br.weekendCount > 0) parts.push(`Weekends: ${br.weekendCount}`)
  if (br.customDayCount > 0) parts.push(`Company days off: ${br.customDayCount}`)

  const namedDays = br.days
    .filter((d) => d.holidayName || d.customDayName)
    .map((d) => `${d.date}: ${d.holidayName ?? d.customDayName}`)
  if (namedDays.length > 0) {
    parts.push("", "Includes:", ...namedDays)
  }
  return parts.join("\n")
}

/** Renders the event title/notes, substituting `{tokens}` if a custom template is given. */
export function renderEventText(
  br: OffBlock,
  titleTemplate?: string,
  notesTemplate?: string
): { summary: string; description: string } {
  const tokens = buildTokens(br)
  return {
    summary: titleTemplate?.trim() ? applyTemplate(titleTemplate, tokens) : defaultSummary(br),
    description: notesTemplate?.trim()
      ? applyTemplate(notesTemplate, tokens)
      : defaultDescription(br),
  }
}

function breakToVEVENT(
  br: OffBlock,
  idx: number,
  now: string,
  titleTemplate?: string,
  notesTemplate?: string
): string[] {
  const { summary, description } = renderEventText(br, titleTemplate, notesTemplate)
  const uid = `timeoff-${br.startDate}-${idx}@dipak.tech`
  const dtend = format(addDays(parseISO(br.endDate), 1), "yyyyMMdd")

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateOnly(br.startDate)}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ]
}

export function breaksToICS(
  breaks: OffBlock[],
  calendarName: string,
  titleTemplate?: string,
  notesTemplate?: string
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tools.dipak.io//Time-off Optimizer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
  ]

  const now = stamp()
  breaks.forEach((br, idx) =>
    lines.push(...breakToVEVENT(br, idx, now, titleTemplate, notesTemplate))
  )

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function breakToICS(br: OffBlock, titleTemplate?: string, notesTemplate?: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tools.dipak.io//Time-off Optimizer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...breakToVEVENT(br, 0, stamp(), titleTemplate, notesTemplate),
    "END:VCALENDAR",
  ].join("\r\n")
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
