import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"
import type { SecurityData } from "@/lib/osint-types"

const RESPONSE_CACHE_TTL = 10 * 60 * 1000
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

const COMMON_DKIM_SELECTORS = [
  "google", "mail", "default", "k1", "s1", "s2",
  "selector1", "selector2", "smtp", "dkim",
]

const DOMAIN_BLOCKLISTS = [
  { name: "Spamhaus DBL", zone: "dbl.spamhaus.org" },
  { name: "SURBL", zone: "multi.surbl.org" },
  { name: "abuse.ch DBL", zone: "dbl.abuse.ch" },
]

const IP_BLOCKLISTS = [
  { name: "Spamhaus ZEN", zone: "zen.spamhaus.org" },
  { name: "SpamCop", zone: "bl.spamcop.net" },
  { name: "SORBS SPAM", zone: "spam.dnsbl.sorbs.net" },
  { name: "Barracuda BRBL", zone: "b.barracudacentral.org" },
]

function isIPv4(s: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(s)
}

function reverseIP(ip: string) {
  return ip.split(".").reverse().join(".")
}

async function dohQuery(name: string, type = "A"): Promise<string[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.Answer ?? []).map((r: { data: string }) => r.data)
  } catch {
    return []
  }
}

function isValidDKIMRecord(raw: string): boolean {
  const r = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw
  if (!r.includes("v=DKIM1")) return false
  const pMatch = r.match(/(?:^|;)\s*p=([^;]*)/)
  return pMatch !== null && pMatch[1].trim().length > 0
}

async function checkDNSBL(query: string): Promise<boolean> {
  const answers = await dohQuery(query, "A")
  return answers.length > 0
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")
    if (!target) return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })

    const normalized = target.trim().toLowerCase()
    const cacheKey = `security:${normalized}`
    const cached = getCached<SecurityData>(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } })

    const clientId = getClientId(request.headers)
    const rateInfo = checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW_MS)
    if (!rateInfo.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, {
        status: 429,
        headers: { ...buildRateLimitHeaders(RATE_LIMIT, rateInfo), "Retry-After": String(Math.ceil(rateInfo.resetAt / 1000)) },
      })
    }

    const isIP = isIPv4(normalized)

    let dnssec: SecurityData["dnssec"] = { enabled: false, algorithm: null }
    if (!isIP) {
      const dsRecords = await dohQuery(normalized, "DS")
      if (dsRecords.length > 0) {
        const tokens = dsRecords[0].trim().split(/\s+/)
        const algoNum = parseInt(tokens[1] ?? "0", 10)
        const algorithms: Record<number, string> = {
          5: "RSA/SHA-1", 7: "RSASHA1-NSEC3-SHA1", 8: "RSA/SHA-256",
          10: "RSA/SHA-512", 13: "ECDSA P-256/SHA-256", 14: "ECDSA P-384/SHA-384",
          15: "Ed25519", 16: "Ed448",
        }
        dnssec = { enabled: true, algorithm: algorithms[algoNum] ?? (isNaN(algoNum) ? null : `Algorithm ${algoNum}`) }
      }
    }

    const dkimSelectors: string[] = []
    let dkimWildcard = false
    if (!isIP) {
      const wildcardCheck = await dohQuery(`_wildcard-probe-osint._domainkey.${normalized}`, "TXT")
      dkimWildcard = wildcardCheck.some((r) => isValidDKIMRecord(r))

      if (!dkimWildcard) {
        const dkimChecks = await Promise.allSettled(
          COMMON_DKIM_SELECTORS.map(async (sel) => {
            const records = await dohQuery(`${sel}._domainkey.${normalized}`, "TXT")
            return records.some((r) => isValidDKIMRecord(r)) ? sel : null
          })
        )
        dkimChecks.forEach((r) => {
          if (r.status === "fulfilled" && r.value) dkimSelectors.push(r.value)
        })
      }
    }

    const listResults = isIP
      ? IP_BLOCKLISTS.map((l) => ({ name: l.name, zone: `${reverseIP(normalized)}.${l.zone}` }))
      : DOMAIN_BLOCKLISTS.map((l) => ({ name: l.name, zone: `${normalized}.${l.zone}` }))

    const blocklistChecks = await Promise.allSettled(
      listResults.map(async ({ name, zone }) => ({
        name,
        listed: await checkDNSBL(zone),
      }))
    )

    const blocklistResults = blocklistChecks
      .filter((r): r is PromiseFulfilledResult<{ name: string; listed: boolean }> => r.status === "fulfilled")
      .map((r) => r.value)

    const payload: SecurityData = {
      dnssec,
      dkim: { selectors: dkimSelectors, wildcard: dkimWildcard },
      blocklist: {
        total: blocklistResults.length,
        clean: blocklistResults.filter((r) => !r.listed).length,
        results: blocklistResults,
      },
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)
    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS", ...buildRateLimitHeaders(RATE_LIMIT, rateInfo) },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "security_check" })
  }
}
