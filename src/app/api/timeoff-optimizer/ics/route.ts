import { timingSafeEqual } from "node:crypto"

import { type NextRequest, NextResponse } from "next/server"

import { getCached, setCached } from "@/lib/osint-cache"
import { breaksToICS } from "@/lib/timeoff-optimizer/ics"
import { fetchPublicHolidays } from "@/lib/timeoff-optimizer/holidays"
import { optimizeDaysAsync } from "@/lib/timeoff-optimizer/optimizer"
import {
  base64DecodeJSON,
  decodeCustomDays,
  decodeLocations,
  decodeTakenDays,
  isStrategy,
} from "@/lib/timeoff-optimizer/share-params"
import type { PlanResult, PlanStrategy } from "@/lib/timeoff-optimizer/types"

export const runtime = "nodejs"

const CACHE_TTL_MS = 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function hasValidKey(request: NextRequest): boolean {
  const secret = process.env.TIMEOFF_OPTIMIZER_ICS_TOKEN
  if (!secret) return false // feature disabled until the owner sets a token

  const provided = request.nextUrl.searchParams.get("key") ?? ""
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  if (!hasValidKey(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const params = request.nextUrl.searchParams
  const currentYear = new Date().getFullYear()

  const yearRaw = parseInt(params.get("year") ?? "", 10)
  const year = yearRaw === currentYear || yearRaw === currentYear + 1 ? yearRaw : currentYear

  const daysRaw = parseInt(params.get("days") ?? "", 10)
  const dayOffBudget = Number.isFinite(daysRaw) ? Math.max(1, Math.min(60, daysRaw)) : 15

  const strategyRaw = params.get("strategy")
  const strategy = isStrategy(strategyRaw) ? strategyRaw : "balanced"

  // Pinned at link-generation time so the feed's event set never silently
  // shifts as today's date advances on subsequent polls (see optimizer.ts
  // buildWindow). Missing/invalid values fall back to "today", which is only
  // safe for one-off requests, not long-lived subscriptions.
  const asOfRaw = params.get("asOf")
  const referenceDate = asOfRaw && DATE_RE.test(asOfRaw) ? asOfRaw : undefined

  const locations = decodeLocations(params.get("loc")).filter((l) => l.country)
  if (locations.length === 0) {
    return NextResponse.json({ error: "No location specified" }, { status: 400 })
  }
  const customDays = decodeCustomDays(params.get("cd"))
  const takenDays = decodeTakenDays(params.get("taken"))
  const titleTemplate = params.get("etitle") ?? undefined
  const notesTemplate = params.get("enotes") ?? undefined
  const noticeByStrategy =
    base64DecodeJSON<Partial<Record<PlanStrategy, number>>>(params.get("notice")) ?? {}

  const cacheKey = `timeoff-ics:${request.nextUrl.search}`
  const cached = getCached<string>(cacheKey)
  if (cached) {
    return new NextResponse(cached, { headers: icsHeaders(year) })
  }

  try {
    const holidayLists = await Promise.all(
      locations.map((l) =>
        fetchPublicHolidays(year, {
          country: l.country!,
          state: l.state ?? undefined,
          region: l.region ?? undefined,
        })
      )
    )
    const seen = new Set<string>()
    const holidays: Array<{ date: string; name: string }> = []
    for (const list of holidayLists) {
      for (const h of list) {
        const key = `${h.date}|${h.name}`
        if (seen.has(key)) continue
        seen.add(key)
        holidays.push(h)
      }
    }

    const filteredCustomDays = customDays.filter((d) =>
      d.isRecurring ? d.startDate && d.endDate : d.date
    )
    const filteredTakenDays = takenDays.filter((d) =>
      d.startDate && d.endDate ? true : !!d.date
    )

    const result: PlanResult = await optimizeDaysAsync({
      dayOffBudget,
      strategy,
      year,
      holidays,
      customDaysOff: filteredCustomDays,
      takenDaysOff: filteredTakenDays,
      referenceDate,
      minNoticeDays: noticeByStrategy[strategy],
    })

    const ics = breaksToICS(result.breaks, `Time off ${year}`, titleTemplate, notesTemplate)
    setCached(cacheKey, ics, CACHE_TTL_MS)

    return new NextResponse(ics, { headers: icsHeaders(year) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to generate calendar" }, { status: 500 })
  }
}

function icsHeaders(year: number) {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="timeoff-${year}.ics"`,
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
  }
}
