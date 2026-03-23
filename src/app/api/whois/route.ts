import { type NextRequest, NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"
import {
  detectQueryType,
  getRDAPBootstrap,
  parseASN,
  findRDAPServerForDomain,
  findRDAPServerForIP,
  findRDAPServerForASN,
} from "@/lib/rdap"

const RESPONSE_CACHE_TTL = 6 * 60 * 60 * 1000
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || searchParams.get("domain")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // Normalize and detect query type
    const normalizedQuery = query.trim()
    const cacheKey = `rdap:${normalizedQuery.toLowerCase()}`
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

    const queryType = detectQueryType(normalizedQuery)

    let rdapServer: string | null = null
    let rdapPath: string

    switch (queryType) {
      case "ipv4": {
        const bootstrap = await getRDAPBootstrap("ipv4")
        rdapServer = findRDAPServerForIP(normalizedQuery, bootstrap, false)
        rdapPath = `ip/${normalizedQuery}`
        break
      }
      case "ipv6": {
        const bootstrap = await getRDAPBootstrap("ipv6")
        rdapServer = findRDAPServerForIP(normalizedQuery, bootstrap, true)
        rdapPath = `ip/${normalizedQuery}`
        break
      }
      case "asn": {
        const asnNumber = parseASN(normalizedQuery)
        const bootstrap = await getRDAPBootstrap("asn")
        rdapServer = findRDAPServerForASN(asnNumber, bootstrap)
        rdapPath = `autnum/${asnNumber}`
        break
      }
      case "domain":
      default: {
        const normalized = normalizedQuery.toLowerCase()
        const bootstrap = await getRDAPBootstrap("dns")
        rdapServer = findRDAPServerForDomain(normalized, bootstrap)
        rdapPath = `domain/${normalized}`
        break
      }
    }

    if (!rdapServer) {
      const typeLabel =
        queryType === "domain"
          ? `TLD: ${normalizedQuery.split(".").pop()}`
          : queryType === "asn"
            ? `ASN: ${normalizedQuery}`
            : `IP: ${normalizedQuery}`
      return NextResponse.json({ error: `No RDAP server found for ${typeLabel}` }, { status: 404 })
    }

    // Query RDAP server
    const rdapUrl = `${rdapServer}${rdapPath}`

    console.log("Querying RDAP server:", rdapUrl)

    const response = await fetch(rdapUrl, {
      headers: {
        Accept: "application/rdap+json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        const typeLabel = queryType === "domain" ? "Domain" : queryType === "asn" ? "ASN" : "IP address"
        return NextResponse.json({ error: `${typeLabel} not found` }, { status: 404 })
      }
      throw new Error(`RDAP server returned ${response.status}`)
    }

    const data = await response.json()

    // Add query type metadata to response
    const payload = {
      ...data,
      _queryType: queryType,
      _query: normalizedQuery,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "whois_lookup" })
  }
}
