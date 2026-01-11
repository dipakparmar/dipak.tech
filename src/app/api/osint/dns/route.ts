import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"] as const
const RESPONSE_CACHE_TTL = 5 * 60 * 1000
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 1000

type RecordType = (typeof RECORD_TYPES)[number]

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target") || searchParams.get("domain")

    if (!target) {
      return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })
    }

    const normalized = target.trim().toLowerCase()
    const cacheKey = `dns:${normalized}`
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
    const results = await Promise.allSettled(RECORD_TYPES.map((type) => queryDNS(normalized, type)))

    const records: Record<RecordType, string[]> = {
      A: [],
      AAAA: [],
      CNAME: [],
      MX: [],
      NS: [],
      TXT: [],
      SOA: [],
    }

    results.forEach((result, index) => {
      const type = RECORD_TYPES[index]
      if (result.status === "fulfilled" && result.value.Answer) {
        records[type] = result.value.Answer.map((record) => record.data)
      }
    })

    const payload = {
      target: normalized,
      records,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    console.error("DNS lookup error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lookup DNS records" },
      { status: 500 },
    )
  }
}

async function queryDNS(name: string, type: RecordType): Promise<DNSResponse> {
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
