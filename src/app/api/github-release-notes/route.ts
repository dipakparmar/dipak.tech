import { type NextRequest, NextResponse } from "next/server"
import { buildRateLimitHeaders, checkRateLimit, getCached, getClientId, setCached } from "@/lib/osint-cache"
import { fetchReleaseNotes } from "@/lib/github"
import { captureAPIError } from "@/lib/sentry-utils"

const CACHE_TTL = 5 * 60 * 1000
const RATE_LIMIT = 12
const RATE_WINDOW_MS = 60 * 1000

type VersionRange = {
  min: string
  max: string
}

type RequestBody = {
  owner?: string
  repo?: string
  versionRanges?: VersionRange[]
}

function normalizeRange(range: VersionRange) {
  return {
    min: range.min.trim(),
    max: range.max.trim(),
  }
}

export async function POST(request: NextRequest) {
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

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const owner = body.owner?.trim()
  const repo = body.repo?.trim()
  const versionRanges = Array.isArray(body.versionRanges)
    ? body.versionRanges.map(normalizeRange).filter((range) => range.min && range.max)
    : []

  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and repo are required" }, { status: 400 })
  }

  if (versionRanges.length === 0) {
    return NextResponse.json({ error: "At least one valid version range is required" }, { status: 400 })
  }

  const rangesKey = versionRanges.map((range) => `${range.min}..${range.max}`).join(",")
  const cacheKey = `release-notes:${owner}/${repo}:${rangesKey}`
  const cached = getCached<unknown>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-Cache": "HIT",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  }

  try {
    const token = process.env.GITHUB_TOKEN?.trim()
    const result = await fetchReleaseNotes(owner, repo, versionRanges, { token })
    setCached(cacheKey, result, CACHE_TTL)

    return NextResponse.json(result, {
      headers: {
        "X-Cache": "MISS",
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
      },
    })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "github_release_notes" })
  }
}
