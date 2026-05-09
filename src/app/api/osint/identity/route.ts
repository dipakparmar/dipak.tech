import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"
import type { IdentityData } from "@/lib/osint-types"

const RESPONSE_CACHE_TTL = 10 * 60 * 1000
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

function parseSecurityTxt(text: string): IdentityData["securityTxt"] {
  const field = (key: string) => {
    const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "mi"))
    return match?.[1]?.trim() ?? null
  }

  const contact = field("Contact")
  const policy = field("Policy")
  const hiring = field("Hiring")

  return {
    found: true,
    contact,
    expires: field("Expires"),
    policy,
    encryption: field("Encryption"),
    acknowledgments: field("Acknowledgments"),
    hiring,
    bugBounty: Boolean(policy || hiring),
  }
}

async function fetchSecurityTxt(domain: string): Promise<IdentityData["securityTxt"]> {
  const paths = [
    `https://${domain}/.well-known/security.txt`,
    `https://${domain}/security.txt`,
  ]

  for (const url of paths) {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 6000)
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "dipak.tech-osint/1.0" },
      })
      if (res.ok) {
        const text = await res.text()
        if (text.includes("Contact:")) return parseSecurityTxt(text)
      }
    } catch {
      continue
    }
  }

  return {
    found: false,
    contact: null,
    expires: null,
    policy: null,
    encryption: null,
    acknowledgments: null,
    hiring: null,
    bugBounty: false,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")
    if (!target) return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })

    const normalized = target.trim().toLowerCase()
    const cacheKey = `identity:${normalized}`
    const cached = getCached<IdentityData>(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } })

    const clientId = getClientId(request.headers)
    const rateInfo = checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW_MS)
    if (!rateInfo.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, {
        status: 429,
        headers: { ...buildRateLimitHeaders(RATE_LIMIT, rateInfo), "Retry-After": String(Math.ceil(rateInfo.resetAt / 1000)) },
      })
    }

    const securityTxt = await fetchSecurityTxt(normalized)
    const payload: IdentityData = { securityTxt }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)
    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS", ...buildRateLimitHeaders(RATE_LIMIT, rateInfo) },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "identity_check" })
  }
}
