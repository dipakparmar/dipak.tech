import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"

interface DNSRecord {
  name: string
  type: number
  TTL: number
  data: string
}

interface DNSResponse {
  Status: number
  Answer?: DNSRecord[]
}
const RESPONSE_CACHE_TTL = 30 * 60 * 1000
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
    const cacheKey = `ip:${normalized.toLowerCase()}`
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
    const isIp = isIPv4(normalized) || isIPv6(normalized)

    const ip = isIp ? normalized : await resolveDomainToIP(normalized)

    if (!ip) {
      return NextResponse.json({ error: "Unable to resolve an IP address" }, { status: 404 })
    }

    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`)

    if (!response.ok) {
      return NextResponse.json({ error: `IP lookup failed: ${response.status}` }, { status: 502 })
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: data.message || "IP lookup failed" }, { status: 400 })
    }

    const payload = {
      ip,
      continent: data.continent,
      country: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      reverse: data.reverse,
      connection: data.connection,
      flags: data.flag,
      proxy: data.proxy,
      tor: data.tor,
      hosting: data.hosting,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "ip_intelligence" })
  }
}

async function resolveDomainToIP(domain: string) {
  const response = await queryDNS(domain, "A")
  if (response.Answer && response.Answer.length > 0) {
    return response.Answer[0].data
  }

  const fallback = await queryDNS(domain, "AAAA")
  if (fallback.Answer && fallback.Answer.length > 0) {
    return fallback.Answer[0].data
  }

  return null
}

async function queryDNS(name: string, type: "A" | "AAAA"): Promise<DNSResponse> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`

  const response = await fetch(url, {
    headers: {
      Accept: "application/dns-json",
    },
  })

  if (!response.ok) {
    throw new Error(`DNS query failed: ${response.status}`)
  }

  return await response.json()
}

function isIPv4(value: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
}

function isIPv6(value: string) {
  return value.includes(":")
}
