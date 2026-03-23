// RDAP Bootstrap URLs for different resource types
export const RDAP_BOOTSTRAP_URLS = {
  dns: "https://data.iana.org/rdap/dns.json",
  ipv4: "https://data.iana.org/rdap/ipv4.json",
  ipv6: "https://data.iana.org/rdap/ipv6.json",
  asn: "https://data.iana.org/rdap/asn.json",
}

export type QueryType = "domain" | "ipv4" | "ipv6" | "asn"

export interface RDAPService {
  services: Array<[string[], string[]]>
}

interface RDAPCache {
  [key: string]: {
    data: RDAPService | null
    timestamp: number
  }
}

const rdapCache: RDAPCache = {}
export const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function getRDAPBootstrap(type: keyof typeof RDAP_BOOTSTRAP_URLS): Promise<RDAPService> {
  const now = Date.now()
  const cached = rdapCache[type]

  // Return cached data if still valid
  if (cached?.data && now - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const response = await fetch(RDAP_BOOTSTRAP_URLS[type])
    const data = await response.json()
    rdapCache[type] = { data, timestamp: now }
    return data
  } catch (error) {
    console.error(`Failed to fetch RDAP bootstrap for ${type}:`, error)
    throw new Error(`Unable to load RDAP service registry for ${type}`)
  }
}

// Detect query type based on input
export function detectQueryType(query: string): QueryType {
  // Check for ASN (e.g., AS12345 or 12345)
  if (/^(AS)?(\d+)$/i.test(query)) {
    return "asn"
  }

  // Check for IPv6 (contains colons)
  if (query.includes(":")) {
    return "ipv6"
  }

  // Check for IPv4 (4 octets separated by dots, all numbers)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(query)) {
    return "ipv4"
  }

  // Default to domain
  return "domain"
}

// Parse ASN to get numeric value
export function parseASN(query: string): string {
  const match = query.match(/^(AS)?(\d+)$/i)
  return match ? match[2] : query
}

export function findRDAPServerForDomain(domain: string, bootstrap: RDAPService): string | null {
  const tld = domain.split(".").pop()?.toLowerCase()

  if (!tld) return null

  for (const [tlds, servers] of bootstrap.services) {
    if (tlds.includes(tld)) {
      return servers[0]
    }
  }

  return null
}

export function findRDAPServerForIP(ip: string, bootstrap: RDAPService, isIPv6: boolean): string | null {
  // For IP addresses, the bootstrap contains CIDR ranges
  // We need to check if the IP falls within any of the ranges
  for (const [ranges, servers] of bootstrap.services) {
    for (const range of ranges) {
      if (isIPInRange(ip, range, isIPv6)) {
        return servers[0]
      }
    }
  }
  return null
}

export function findRDAPServerForASN(asn: string, bootstrap: RDAPService): string | null {
  const asnNum = parseInt(asn, 10)

  for (const [ranges, servers] of bootstrap.services) {
    for (const range of ranges) {
      // ASN ranges are in format "start-end" or just "number"
      if (range.includes("-")) {
        const [start, end] = range.split("-").map((n) => parseInt(n, 10))
        if (asnNum >= start && asnNum <= end) {
          return servers[0]
        }
      } else {
        if (asnNum === parseInt(range, 10)) {
          return servers[0]
        }
      }
    }
  }
  return null
}

// Helper to check if IP is in CIDR range
export function isIPInRange(ip: string, cidr: string, isIPv6: boolean): boolean {
  try {
    if (isIPv6) {
      return isIPv6InRange(ip, cidr)
    } else {
      return isIPv4InRange(ip, cidr)
    }
  } catch {
    return false
  }
}

export function isIPv4InRange(ip: string, cidr: string): boolean {
  const [rangeIP, prefixStr] = cidr.split("/")
  const prefix = parseInt(prefixStr || "32", 10)

  const ipNum = ipv4ToNumber(ip)
  const rangeNum = ipv4ToNumber(rangeIP)
  const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1) >>> 0

  return (ipNum & mask) === (rangeNum & mask)
}

export function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".").map((p) => parseInt(p, 10))
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

export function isIPv6InRange(ip: string, cidr: string): boolean {
  const [rangeIP, prefixStr] = cidr.split("/")
  const prefix = parseInt(prefixStr || "128", 10)

  const ipBytes = expandIPv6(ip)
  const rangeBytes = expandIPv6(rangeIP)

  const fullBytes = Math.floor(prefix / 8)
  const remainingBits = prefix % 8

  // Compare full bytes
  for (let i = 0; i < fullBytes; i++) {
    if (ipBytes[i] !== rangeBytes[i]) return false
  }

  // Compare remaining bits if any
  if (remainingBits > 0 && fullBytes < 16) {
    const mask = (0xff << (8 - remainingBits)) & 0xff
    if ((ipBytes[fullBytes] & mask) !== (rangeBytes[fullBytes] & mask)) {
      return false
    }
  }

  return true
}

export function expandIPv6(ip: string): number[] {
  // Handle :: expansion
  let fullIP = ip
  if (ip.includes("::")) {
    const parts = ip.split("::")
    const left = parts[0] ? parts[0].split(":") : []
    const right = parts[1] ? parts[1].split(":") : []
    const missing = 8 - left.length - right.length
    const middle = Array(missing).fill("0")
    fullIP = [...left, ...middle, ...right].join(":")
  }

  const parts = fullIP.split(":")
  const bytes: number[] = []

  for (const part of parts) {
    const num = parseInt(part || "0", 16)
    bytes.push((num >> 8) & 0xff)
    bytes.push(num & 0xff)
  }

  return bytes
}

/**
 * High-level function that combines bootstrap lookup, server selection, and RDAP fetch.
 * Throws on failure (no RDAP server found, or HTTP error).
 */
export async function queryRDAP(query: string, type: QueryType): Promise<Record<string, unknown>> {
  let rdapServer: string | null = null
  let rdapPath: string

  switch (type) {
    case "ipv4": {
      const bootstrap = await getRDAPBootstrap("ipv4")
      rdapServer = findRDAPServerForIP(query, bootstrap, false)
      rdapPath = `ip/${query}`
      break
    }
    case "ipv6": {
      const bootstrap = await getRDAPBootstrap("ipv6")
      rdapServer = findRDAPServerForIP(query, bootstrap, true)
      rdapPath = `ip/${query}`
      break
    }
    case "asn": {
      const asnNumber = parseASN(query)
      const bootstrap = await getRDAPBootstrap("asn")
      rdapServer = findRDAPServerForASN(asnNumber, bootstrap)
      rdapPath = `autnum/${asnNumber}`
      break
    }
    case "domain":
    default: {
      const normalized = query.toLowerCase()
      const bootstrap = await getRDAPBootstrap("dns")
      rdapServer = findRDAPServerForDomain(normalized, bootstrap)
      rdapPath = `domain/${normalized}`
      break
    }
  }

  if (!rdapServer) {
    const typeLabel =
      type === "domain"
        ? `TLD: ${query.split(".").pop()}`
        : type === "asn"
          ? `ASN: ${query}`
          : `IP: ${query}`
    throw new Error(`No RDAP server found for ${typeLabel}`)
  }

  const rdapUrl = `${rdapServer}${rdapPath}`

  const response = await fetch(rdapUrl, {
    headers: {
      Accept: "application/rdap+json",
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    if (response.status === 404) {
      const typeLabel = type === "domain" ? "Domain" : type === "asn" ? "ASN" : "IP address"
      throw new Error(`${typeLabel} not found`)
    }
    throw new Error(`RDAP server returned ${response.status}`)
  }

  const data = await response.json()
  return data as Record<string, unknown>
}
