import type { ParsedInput } from "@/types/network"

const IPV4_OCTET = `(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)`
const IPV4_PATTERN = `${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}`
const IPV4_REGEX = new RegExp(`^${IPV4_PATTERN}$`)
const IPV4_WITH_PORT_REGEX = new RegExp(`^(${IPV4_PATTERN}):\\d+$`)
const IPV4_IN_PROSE_REGEX = new RegExp(`\\b(${IPV4_PATTERN})\\b`)
const CIDR_REGEX = new RegExp(`^(${IPV4_PATTERN}|[0-9a-fA-F:]+)/(\\d{1,3})$`)
const ASN_PREFIXED_REGEX = /^AS(\d+)$/i
const MAX_ASN = 4_294_967_295

export function parseNetworkInput(raw: string): ParsedInput {
  const original = raw
  const trimmed = raw.trim()

  if (!trimmed) {
    return { type: "unknown", value: "", original, confidence: "exact" }
  }

  // 1. CIDR notation (must check before IPv4 since CIDR contains an IP)
  const cidrMatch = trimmed.match(CIDR_REGEX)
  if (cidrMatch) {
    const prefixLen = parseInt(cidrMatch[2], 10)
    const isIPv6CIDR = cidrMatch[1].includes(":")
    const maxPrefix = isIPv6CIDR ? 128 : 32
    if (prefixLen >= 0 && prefixLen <= maxPrefix) {
      return { type: "cidr", value: trimmed, original, confidence: "exact" }
    }
  }

  // 2. ASN — prefixed (AS13335) or bare digits only
  const asnPrefixed = trimmed.match(ASN_PREFIXED_REGEX)
  if (asnPrefixed) {
    const num = parseInt(asnPrefixed[1], 10)
    if (num >= 1 && num <= MAX_ASN) {
      return { type: "asn", value: asnPrefixed[1], original, confidence: "exact" }
    }
  }
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10)
    if (num >= 1 && num <= MAX_ASN) {
      return { type: "asn", value: trimmed, original, confidence: "exact" }
    }
  }

  // 3. URL extraction — extract hostname
  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed)
      const hostname = url.hostname.replace(/^\[|\]$/g, "") // strip IPv6 brackets
      // Recurse with extracted hostname
      const inner = parseNetworkInput(hostname)
      return { ...inner, original, confidence: "extracted" }
    } catch {
      // Not a valid URL, continue
    }
  }

  // 4. Bracketed IPv6
  const bracketMatch = trimmed.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/)
  if (bracketMatch) {
    return { type: "ipv6", value: bracketMatch[1], original, confidence: "exact" }
  }

  // 5. IPv6 (contains colon, not a URL)
  if (trimmed.includes(":") && /^[0-9a-fA-F:]+$/.test(trimmed)) {
    return { type: "ipv6", value: trimmed, original, confidence: "exact" }
  }

  // 6. IPv4 with port
  const ipv4PortMatch = trimmed.match(IPV4_WITH_PORT_REGEX)
  if (ipv4PortMatch) {
    return { type: "ipv4", value: ipv4PortMatch[1], original, confidence: "extracted" }
  }

  // 7. Plain IPv4
  if (IPV4_REGEX.test(trimmed)) {
    return { type: "ipv4", value: trimmed, original, confidence: "exact" }
  }

  // 8. IPv4 in prose — extract first valid IPv4
  const proseMatch = trimmed.match(IPV4_IN_PROSE_REGEX)
  if (proseMatch && trimmed.length > proseMatch[0].length) {
    const candidate = proseMatch[1]
    if (IPV4_REGEX.test(candidate)) {
      return { type: "ipv4", value: candidate, original, confidence: "extracted" }
    }
  }

  // 9. Domain — has a dot, no spaces, looks like a hostname
  if (
    /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)+$/.test(
      trimmed
    )
  ) {
    return { type: "domain", value: trimmed.toLowerCase(), original, confidence: "exact" }
  }

  // 10. Unknown
  return { type: "unknown", value: trimmed, original, confidence: "exact" }
}
