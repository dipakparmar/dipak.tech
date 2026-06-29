const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
])

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(lower)) return true
  // IPv6: loopback (::1), unique-local (fc::/7), link-local (fe80::/10)
  if (/^(::1$|fc[0-9a-f]|fd[0-9a-f]|fe[89ab][0-9a-f])/i.test(lower)) return true
  return PRIVATE_IPV4_PATTERNS.some((r) => r.test(lower))
}

/**
 * Returns true if the URL targets a private/internal host.
 * Use this to return a clean 400 without logging to Sentry - blocking is expected behavior.
 */
export function isSsrfTarget(url: string | URL): boolean {
  try {
    const parsed = typeof url === 'string' ? new URL(url) : url
    return isPrivateHost(parsed.hostname)
  } catch {
    return true
  }
}
