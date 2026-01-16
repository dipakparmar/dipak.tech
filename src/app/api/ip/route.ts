import { NextRequest, NextResponse } from "next/server"
import { IPResponse } from "@/types/ip"
import { captureAPIError } from "@/lib/sentry-utils"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"

const RESPONSE_CACHE_TTL = 30 * 60 * 1000
const RATE_LIMIT = 40
const RATE_WINDOW_MS = 60 * 1000

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Prefer 'target' param for consistency, fallback to 'ip'
    const target = searchParams.get("target") || searchParams.get("ip")
    const details = searchParams.get("details") === "true"
    const user_agent = request.headers.get("user-agent")

    // Determine IP: target param > auto-detect from headers
    let ip: string
    if (target) {
      const normalized = target.trim()
      // Check if target is an IP or domain
      const isIp = isIPv4(normalized) || isIPv6(normalized)

      if (isIp) {
        ip = normalized
      } else {
        // Resolve domain to IP
        const resolvedIp = await resolveDomainToIP(normalized)
        if (!resolvedIp) {
          return NextResponse.json({ error: "Unable to resolve domain to IP address" }, { status: 404 })
        }
        ip = resolvedIp
      }
    } else {
      // Auto-detect user's IP from headers
      const cf_connecting_ip = request.headers.get("cf-connecting-ip")
      const x_real_ip = request.headers.get("x-real-ip")
      const original_forwarded_for = request.headers.get("x-original-forwarded-for")
      const forwarded_for = request.headers.get("x-forwarded-for")

      ip = cf_connecting_ip || x_real_ip || original_forwarded_for || forwarded_for || ""

      // If IP is localhost, treat it as empty (let ip-api auto-detect)
      if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) {
        ip = ""
      }
    }

    // Simple mode: just return the IP
    if (!details) {
      // If we couldn't detect a real IP, let ip-api.com auto-detect by calling without IP
      if (!ip) {
        const detectResponse = await fetch("http://ip-api.com/json?fields=query")
        if (detectResponse.ok) {
          const detectData = await detectResponse.json()
          if (detectData.query) {
            ip = detectData.query
          }
        }
      }

      // Return plain text for curl clients
      if (user_agent?.startsWith("curl")) {
        return new NextResponse(ip, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      } else {
        return NextResponse.json({ ip }, { status: 200 })
      }
    }

    // Details mode: Check cache first
    const cacheKey = `ip:${ip.toLowerCase()}`
    const cached = getCached<IPResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } })
    }

    // Rate limiting
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
        }
      )
    }

    // Fetch comprehensive IP information
    const apiUrl = ip
      ? `http://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query`
      : `http://ip-api.com/json?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query`

    const response = await fetch(apiUrl, {
      headers: {
        accept: "*/*",
        "user-agent": "curl/7.79.1",
      },
    })

    const res_headers = response.headers
    const data: IPResponse = await response.json()

    // Use the IP from the response if we didn't have one
    const finalIp = ip || data.query || ""

    // Add rate limit info from API headers
    data.req_left = parseInt(res_headers.get("X-Rl") || "0")
    data.resets_in = parseInt(res_headers.get("X-Ttl") || "60")
    data.ip_type = ipType(finalIp)
    data.ip = finalIp
    delete (data as any).query

    // Cache the result
    setCached(cacheKey, data, RESPONSE_CACHE_TTL)

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "ip_info" })
  }
}

function ipType(ip: string) {
  return ip.includes(":") ? "IPv6" : "IPv4"
}

function isIPv4(value: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
}

function isIPv6(value: string) {
  return value.includes(":")
}

async function resolveDomainToIP(domain: string): Promise<string | null> {
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
