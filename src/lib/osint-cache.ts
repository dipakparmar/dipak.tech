type CacheEntry = {
  value: unknown
  expiresAt: number
}

type RateEntry = {
  count: number
  resetAt: number
}

const cacheStore = new Map<string, CacheEntry>()
const rateStore = new Map<string, RateEntry>()

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }

  return entry.value as T
}

export function setCached(key: string, value: unknown, ttlMs: number) {
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function checkRateLimit(clientId: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = rateStore.get(clientId)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    rateStore.set(clientId, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: Math.max(limit - entry.count, 0), resetAt: entry.resetAt }
}

export function getClientId(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  return headers.get("x-real-ip") || "unknown"
}

export function buildRateLimitHeaders(limit: number, info: { remaining: number; resetAt: number }) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(info.remaining),
    "X-RateLimit-Reset": String(Math.ceil(info.resetAt / 1000)),
  }
}
