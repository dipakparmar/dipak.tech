import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"

interface CertEntry {
  issuer_name: string
  name_value: string
  not_before: string
  not_after: string
  serial_number: string
}
const RESPONSE_CACHE_TTL = 6 * 60 * 60 * 1000
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 1000

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target") || searchParams.get("domain")

    if (!target) {
      return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })
    }

    const normalized = target.trim().toLowerCase()
    const cacheKey = `certs:${normalized}`
    const cached = getCached<Record<string, unknown>>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } })
    }

    const clientId = getClientId(request.headers)
    const rateInfo = checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW_MS)
    if (!rateInfo.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
            "Retry-After": String(Math.ceil(rateInfo.resetAt / 1000)),
          },
        },
      )
    }
    const url = `https://crt.sh/?q=${encodeURIComponent(normalized)}&output=json`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "dipak.tech-osint/1.0",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Certificate lookup failed: ${response.status}` }, { status: 502 })
    }

    const entries = (await response.json()) as CertEntry[]
    const deduped = dedupeEntries(entries)

    const names = uniqueValues(
      deduped.flatMap((entry) => entry.name_value.split("\n").map((name) => name.trim())),
    ).slice(0, 20)

    const issuers = uniqueValues(deduped.map((entry) => entry.issuer_name)).slice(0, 10)
    const latestExpiry = getLatestExpiry(deduped)

    const payload = {
      target: normalized,
      total: entries.length,
      uniqueEntries: deduped.length,
      names,
      issuers,
      latestExpiry,
      entries: deduped.slice(0, 30),
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "certificate_lookup" })
  }
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function dedupeEntries(entries: CertEntry[]) {
  const seen = new Set<string>()
  const result: CertEntry[] = []

  entries.forEach((entry) => {
    const key = `${entry.serial_number}-${entry.issuer_name}-${entry.not_after}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(entry)
    }
  })

  return result
}

function getLatestExpiry(entries: CertEntry[]) {
  if (entries.length === 0) return null

  const latest = entries.reduce((current, entry) => {
    const currentDate = new Date(current.not_after).getTime()
    const entryDate = new Date(entry.not_after).getTime()
    return entryDate > currentDate ? entry : current
  })

  return latest.not_after
}
