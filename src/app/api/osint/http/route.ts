import { NextResponse } from "next/server"
import {
  buildRateLimitHeaders,
  checkRateLimit,
  getCached,
  getClientId,
  setCached,
} from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"
import { detectWAF } from "@/lib/waf-detector"
import { detectTechStack } from "@/lib/tech-stack"
import { parseSocialTags } from "@/lib/social-tags"
import type { CookieInfo, RedirectHop } from "@/lib/osint-types"

const HEADER_ALLOWLIST = [
  "server", "content-type", "content-length", "cache-control",
  "x-powered-by", "x-served-by", "x-cache", "x-cache-hits",
  "cf-ray", "cf-cache-status", "via", "strict-transport-security",
  "content-security-policy", "x-frame-options", "referrer-policy",
  "permissions-policy", "x-vercel-id", "x-vercel-cache",
  "x-amz-cf-id", "x-akamai-transformed", "x-sucuri-id",
  "x-shopid", "x-github-request-id", "x-nf-request-id",
]

const SECURITY_HEADERS = [
  "strict-transport-security", "content-security-policy",
  "x-frame-options", "referrer-policy", "permissions-policy",
]

const RESPONSE_CACHE_TTL = 5 * 60 * 1000
const RATE_LIMIT = 40
const RATE_WINDOW_MS = 60 * 1000
const HTML_CAP = 100_000
const MAX_REDIRECTS = 10
const FETCH_TIMEOUT_MS = 8000

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("target")
    if (!target) return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })

    const normalized = target.trim()
    const cacheKey = `http:${normalized.toLowerCase()}`
    const cached = getCached<Record<string, unknown>>(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } })

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

    const startUrls = normalized.includes("://")
      ? [normalized]
      : [`https://${normalized}`, `http://${normalized}`]

    const result = await fetchWithChain(startUrls)
    if (!result) return NextResponse.json({ error: "Unable to reach target" }, { status: 502 })

    const { response, chain, allHeaders } = result
    const html = await readLimitedBody(response, HTML_CAP)

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    const headers: Record<string, string> = {}
    const securityHeaders: Record<string, string> = {}

    HEADER_ALLOWLIST.forEach((h) => {
      const v = allHeaders[h]
      if (v) headers[h] = v
    })
    SECURITY_HEADERS.forEach((h) => {
      const v = allHeaders[h]
      if (v) securityHeaders[h] = v
    })

    const cookies = parseCookies(response.headers)
    const waf = detectWAF(allHeaders)
    const techStack = detectTechStack(allHeaders, html)
    const socialTags = parseSocialTags(html)

    const payload = {
      url: response.url,
      status: response.status,
      ok: response.ok,
      redirected: chain.length > 1,
      title,
      headers,
      securityHeaders,
      cookies,
      redirectChain: chain,
      waf,
      techStack,
      socialTags,
    }

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL)
    return NextResponse.json(payload, {
      headers: { "X-Cache": "MISS", ...buildRateLimitHeaders(RATE_LIMIT, rateInfo) },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "http_fingerprint" })
  }
}

async function fetchWithChain(startUrls: string[]) {
  for (const startUrl of startUrls) {
    try {
      const chain: RedirectHop[] = []
      let currentUrl = startUrl
      const allHeaders: Record<string, string> = {}

      for (let i = 0; i < MAX_REDIRECTS; i++) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        const hopStart = Date.now()

        const response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "dipak.tech-osint/1.0",
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          },
        })
        clearTimeout(timeout)

        const latencyMs = Date.now() - hopStart
        chain.push({ url: currentUrl, status: response.status, latencyMs })

        response.headers.forEach((value, key) => {
          if (!allHeaders[key.toLowerCase()]) allHeaders[key.toLowerCase()] = value
        })

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location")
          if (!location) break
          currentUrl = new URL(location, currentUrl).href
          continue
        }

        return { response, chain, allHeaders }
      }
    } catch {
      continue
    }
  }
  return null
}

function parseCookies(headers: Headers): CookieInfo[] {
  const raw = headers.getSetCookie?.() ?? [headers.get("set-cookie")].filter(Boolean) as string[]
  return raw.map((cookie) => {
    const parts = cookie.split(";").map((p) => p.trim())
    const [nameValue] = parts
    const eqIdx = nameValue.indexOf("=")
    const name = eqIdx >= 0 ? nameValue.slice(0, eqIdx).trim() : nameValue.trim()
    const attrs = parts.slice(1)
    const attr = (key: string) =>
      attrs.find((a) => a.toLowerCase().startsWith(key.toLowerCase()))

    const sameSiteRaw = attr("samesite=")?.split("=")?.[1]?.trim() ?? null
    const sameSite =
      sameSiteRaw === "Strict" || sameSiteRaw === "Lax" || sameSiteRaw === "None"
        ? sameSiteRaw
        : null

    return {
      name,
      domain: attr("domain=")?.split("=")?.[1]?.trim() ?? null,
      path: attr("path=")?.split("=")?.[1]?.trim() ?? null,
      secure: attrs.some((a) => a.toLowerCase() === "secure"),
      httpOnly: attrs.some((a) => a.toLowerCase() === "httponly"),
      sameSite,
      expires: attr("expires=")?.split("=")?.slice(1)?.join("=")?.trim() ?? null,
    }
  })
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
  const buffer = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0))
  let offset = 0
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(buffer)
}
