import { addDays, format, parseISO } from "date-fns"

import { renderEventText } from "./ics"
import type { OffBlock } from "./types"

/** All-day events are exclusive of their end date, so end = endDate + 1 day. */
function exclusiveEnd(endDate: string) {
  return format(addDays(parseISO(endDate), 1), "yyyyMMdd")
}

export function googleCalendarUrl(br: OffBlock, titleTemplate?: string, notesTemplate?: string): string {
  const { summary, description } = renderEventText(br, titleTemplate, notesTemplate)
  const start = format(parseISO(br.startDate), "yyyyMMdd")
  const end = exclusiveEnd(br.endDate)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${start}/${end}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Shared by Outlook.com (personal) and Office 365 (work/school) web calendars. */
function outlookUrl(base: string, br: OffBlock, titleTemplate?: string, notesTemplate?: string): string {
  const { summary, description } = renderEventText(br, titleTemplate, notesTemplate)
  const params = new URLSearchParams({
    rru: "addevent",
    subject: summary,
    body: description,
    startdt: br.startDate,
    enddt: format(addDays(parseISO(br.endDate), 1), "yyyy-MM-dd"),
    allday: "true",
  })
  return `${base}?${params.toString()}`
}

export const outlookComUrl = (br: OffBlock, titleTemplate?: string, notesTemplate?: string) =>
  outlookUrl("https://outlook.live.com/calendar/0/deeplink/compose", br, titleTemplate, notesTemplate)

export const office365Url = (br: OffBlock, titleTemplate?: string, notesTemplate?: string) =>
  outlookUrl("https://outlook.office.com/calendar/0/deeplink/compose", br, titleTemplate, notesTemplate)

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
