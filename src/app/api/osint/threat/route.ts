import { NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"
import type { ThreatData, ShodanHostInfo } from "@/lib/osint-types"

const RESPONSE_CACHE_TTL = 30 * 60 * 1000
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 1000

function isIPv4(s: string) { return /^(\d{1,3}\.){3}\d{1,3}$/.test(s) }

async function resolveIPs(domain: string): Promise<string[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.Answer ?? []).map((r: { data: string }) => r.data).filter(isIPv4)
  } catch { return [] }
}

async function fetchShodan(ip: string): Promise<ShodanHostInfo | null> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`https://internetdb.shodan.io/${ip}`, {
      signal: controller.signal,
      headers: { "User-Agent": "dipak.tech-osint/1.0" },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      ip,
      ports: data.ports ?? [],
      vulns: data.vulns ?? [],
      tags: data.tags ?? [],
    }
  } catch { return null }
}

async function fetchWayback(domain: string): Promise<ThreatData["wayback"]> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 8000)

    const [availRes, firstRes, countRes] = await Promise.allSettled([
      fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`, { signal: controller.signal }),
      fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=1&from=19960101`),
      fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&collapse=timestamp:8&showNumPages=true`),
    ])

    let latestUrl: string | null = null
    let lastArchived: string | null = null
    if (availRes.status === "fulfilled" && availRes.value.ok) {
      const avail = await availRes.value.json()
      latestUrl = avail?.archived_snapshots?.closest?.url ?? null
      const ts = avail?.archived_snapshots?.closest?.timestamp
      if (ts) lastArchived = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`
    }

    let firstSeen: string | null = null
    if (firstRes.status === "fulfilled" && firstRes.value.ok) {
      const rows = await firstRes.value.json()
      const ts = rows?.[1]?.[0]
      if (ts) firstSeen = ts.slice(0, 4)
    }

    let approximateCount: number | null = null
    if (countRes.status === "fulfilled" && countRes.value.ok) {
      const text = await countRes.value.text()
      const num = parseInt(text.trim(), 10)
      if (!isNaN(num)) approximateCount = num
    }

    return {
      available: latestUrl !== null,
      firstSeen,
      lastArchived,
      latestUrl,
      approximateCount,
    }
  } catch {
    return { available: false, firstSeen: null, lastArchived: null, latestUrl: null, approximateCount: null }
  }
}

async function fetchCrawlRules(domain: string): Promise<ThreatData["crawl"]> {
  const robots = { found: false, disallowCount: 0, userAgentCount: 0, sitemapUrls: [] as string[] }
  const sitemap = { found: false, urlCount: 0, lastModified: null as string | null }

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`https://${domain}/robots.txt`, { signal: controller.signal, redirect: "follow" })
    if (res.ok) {
      const text = await res.text()
      const disallows = (text.match(/^Disallow:/gim) ?? []).length
      const userAgents = new Set((text.match(/^User-agent:\s*(.+)/gim) ?? []).map((l) => l.replace(/^User-agent:\s*/i, "").trim()))
      const sitemapUrls = (text.match(/^Sitemap:\s*(.+)/gim) ?? []).map((l) => l.replace(/^Sitemap:\s*/i, "").trim())
      Object.assign(robots, { found: true, disallowCount: disallows, userAgentCount: userAgents.size, sitemapUrls })
    }
  } catch { /* ignore */ }

  const sitemapUrlsToTry = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls.slice(0, 2)
    : [`https://${domain}/sitemap.xml`, `https://${domain}/sitemap_index.xml`]

  for (const sitemapUrl of sitemapUrlsToTry) {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      const res = await fetch(sitemapUrl, { signal: controller.signal, redirect: "follow" })
      if (res.ok) {
        const text = await res.text()
        const urlCount = (text.match(/<loc>/g) ?? []).length
        const lastModMatch = text.match(/<lastmod>([^<]+)<\/lastmod>/)
        sitemap.found = true
        sitemap.urlCount = urlCount
        sitemap.lastModified = lastModMatch?.[1]?.slice(0, 10) ?? null
        break
      }
    } catch { continue }
  }

  return { robots, sitemap }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")
    if (!target) return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })

    const normalized = target.trim().toLowerCase()
    const cacheKey = `threat:${normalized}`
    const cached = getCached<ThreatData>(cacheKey)
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
    const ipsToCheck = isIP ? [normalized] : (await resolveIPs(normalized)).slice(0, 3)

    const [shodanResults, wayback, crawl] = await Promise.all([
      Promise.all(ipsToCheck.map(fetchShodan)),
      isIP ? Promise.resolve({ available: false, firstSeen: null, lastArchived: null, latestUrl: null, approximateCount: null }) : fetchWayback(normalized),
      isIP ? Promise.resolve({ robots: { found: false, disallowCount: 0, userAgentCount: 0, sitemapUrls: [] }, sitemap: { found: false, urlCount: 0, lastModified: null } }) : fetchCrawlRules(normalized),
    ])

    const payload: ThreatData = {
      shodan: shodanResults.filter((r): r is ShodanHostInfo => r !== null),
      wayback,
      crawl,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)
    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS", ...buildRateLimitHeaders(RATE_LIMIT, rateInfo) },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "threat_check" })
  }
}
