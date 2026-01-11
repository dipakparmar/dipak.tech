import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"

const HEADER_ALLOWLIST = [
  "server",
  "content-type",
  "content-length",
  "cache-control",
  "x-powered-by",
  "x-served-by",
  "x-cache",
  "x-cache-hits",
  "cf-ray",
  "cf-cache-status",
  "via",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
]

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
]
const RESPONSE_CACHE_TTL = 5 * 60 * 1000
const RATE_LIMIT = 40
const RATE_WINDOW_MS = 60 * 1000

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")

    if (!target) {
      return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })
    }

    const normalized = target.trim()
    const cacheKey = `http:${normalized.toLowerCase()}`
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
    const urls = normalized.includes("://")
      ? [normalized]
      : [`https://${normalized}`, `http://${normalized}`]

    const response = await fetchFirstSuccessful(urls)
    if (!response) {
      return NextResponse.json({ error: "Unable to reach target" }, { status: 502 })
    }

    const text = await readLimitedBody(response, 160_000)
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    const headers: Record<string, string> = {}
    const securityHeaders: Record<string, string> = {}

    HEADER_ALLOWLIST.forEach((header) => {
      const value = response.headers.get(header)
      if (value) {
        headers[header] = value
      }
    })

    SECURITY_HEADERS.forEach((header) => {
      const value = response.headers.get(header)
      if (value) {
        securityHeaders[header] = value
      }
    })

    const payload = {
      url: response.url,
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      title,
      headers,
      securityHeaders,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    console.error("HTTP fingerprint error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch HTTP metadata" },
      { status: 500 },
    )
  }
}

async function fetchFirstSuccessful(urls: string[]) {
  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "dipak.tech-osint/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      })

      clearTimeout(timeout)

      return response
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        continue
      }
    }
  }

  return null
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const reader = response.body?.getReader()
  if (!reader) return ""

  const chunks: Uint8Array[] = []
  let received = 0

  while (received < maxBytes) {
    const { done, value } = await reader.read()
    if (done || !value) break

    chunks.push(value)
    received += value.length

    if (received >= maxBytes) break
  }

  const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const buffer = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  return new TextDecoder().decode(buffer)
}
