import { addDays, format, parseISO } from "date-fns"

import type { OffBlock } from "./types"

function buildBreakText(br: OffBlock) {
  const title = `Time off (${br.totalDays} day${br.totalDays === 1 ? "" : "s"})`

  const descParts: string[] = [`PTO days: ${br.dayOffCount}`]
  if (br.holidayCount > 0) descParts.push(`Public holidays: ${br.holidayCount}`)
  if (br.weekendCount > 0) descParts.push(`Weekends: ${br.weekendCount}`)
  if (br.customDayCount > 0) descParts.push(`Company days off: ${br.customDayCount}`)

  const namedDays = br.days
    .filter((d) => d.holidayName || d.customDayName)
    .map((d) => `${d.date}: ${d.holidayName ?? d.customDayName}`)
  if (namedDays.length > 0) descParts.push("", "Includes:", ...namedDays)

  return { title, description: descParts.join("\n") }
}

/** All-day events are exclusive of their end date, so end = endDate + 1 day. */
function exclusiveEnd(endDate: string) {
  return format(addDays(parseISO(endDate), 1), "yyyyMMdd")
}

export function googleCalendarUrl(br: OffBlock): string {
  const { title, description } = buildBreakText(br)
  const start = format(parseISO(br.startDate), "yyyyMMdd")
  const end = exclusiveEnd(br.endDate)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Shared by Outlook.com (personal) and Office 365 (work/school) web calendars. */
function outlookUrl(base: string, br: OffBlock): string {
  const { title, description } = buildBreakText(br)
  const params = new URLSearchParams({
    rru: "addevent",
    subject: title,
    body: description,
    startdt: br.startDate,
    enddt: format(addDays(parseISO(br.endDate), 1), "yyyy-MM-dd"),
    allday: "true",
  })
  return `${base}?${params.toString()}`
}

export const outlookComUrl = (br: OffBlock) =>
  outlookUrl("https://outlook.live.com/calendar/0/deeplink/compose", br)

export const office365Url = (br: OffBlock) =>
  outlookUrl("https://outlook.office.com/calendar/0/deeplink/compose", br)

/** Subscribes the calendar app to a live .ics feed URL, importing every break in one click. */
export function googleSubscribeUrl(icsFeedUrl: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsFeedUrl)}`
}

function outlookSubscribeUrl(base: string, icsFeedUrl: string, name: string): string {
  const params = new URLSearchParams({ url: icsFeedUrl, name })
  return `${base}?${params.toString()}`
}

export const outlookComSubscribeUrl = (icsFeedUrl: string, name: string) =>
  outlookSubscribeUrl("https://outlook.live.com/calendar/0/addcalendar", icsFeedUrl, name)

export const office365SubscribeUrl = (icsFeedUrl: string, name: string) =>
  outlookSubscribeUrl("https://outlook.office.com/calendar/0/addcalendar", icsFeedUrl, name)
