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
import { queryDomainWhoisFallback } from "@/lib/whois"

export const runtime = "nodejs"

const RESPONSE_CACHE_TTL = 6 * 60 * 60 * 1000
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "WHOIS lookup failed"
}

function shouldFallbackToWhois(queryType: ReturnType<typeof detectQueryType>, error: unknown): boolean {
  if (queryType !== "domain") return false

  const message = getErrorMessage(error)
  if (message === "Domain not found") return false

  return true
}

function formatNoRdapMessage(queryType: string, query: string): string {
  return queryType === "domain"
    ? `No RDAP server found for TLD: ${query.split(".").pop()}`
    : queryType === "asn"
      ? `No RDAP server found for ASN: ${query}`
      : `No RDAP server found for IP: ${query}`
}

async function fetchRdapPayload(
  normalizedQuery: string,
  queryType: ReturnType<typeof detectQueryType>
): Promise<Record<string, unknown>> {
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
    throw new Error(formatNoRdapMessage(queryType, normalizedQuery))
  }

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
      throw new Error(`${typeLabel} not found`)
    }
    throw new Error(`RDAP server returned ${response.status}`)
  }

  const data = await response.json()

  return {
    ...data,
    _queryType: queryType,
    _query: normalizedQuery,
    _source: "rdap",
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || searchParams.get("domain")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // Normalize and detect query type
    const normalizedQuery = query.trim()
    const cacheKey = `whois:${normalizedQuery.toLowerCase()}`
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
    let payload: Record<string, unknown>

    try {
      payload = await fetchRdapPayload(normalizedQuery, queryType)
    } catch (rdapError) {
      if (!shouldFallbackToWhois(queryType, rdapError)) {
        const message = getErrorMessage(rdapError)
        const status = message.includes("not found") || message.includes("No RDAP server found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
      }

      const fallbackReason = getErrorMessage(rdapError)
      try {
        payload = await queryDomainWhoisFallback(normalizedQuery, fallbackReason)
      } catch (whoisError) {
        const message = getErrorMessage(whoisError)
        const status = message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
      }
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
