import { NextResponse } from "next/server"

export const runtime = "edge"

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

interface ResolveResult {
  ips: string[]
  ipv6?: string[]
  cname?: string
  nameservers?: string[]
  mxRecords?: string[]
  txtRecords?: string[]
  isUnresolved: boolean
}

/**
 * Resolve IP addresses for subdomains using DNS over HTTPS (Cloudflare)
 */
export async function POST(request: Request) {
  try {
    const { subdomains } = await request.json()

    if (!Array.isArray(subdomains) || subdomains.length === 0) {
      return NextResponse.json({ error: "Invalid subdomains array" }, { status: 400 })
    }

    // Resolve IPs for all subdomains in parallel (limit to prevent overwhelming)
    const batchSize = 10
    const results: Record<string, ResolveResult> = {}

    for (let i = 0; i < subdomains.length; i += batchSize) {
      const batch = subdomains.slice(i, i + batchSize)
      const promises = batch.map(async (subdomain: string) => {
        try {
          const result = await resolveSubdomain(subdomain)
          return { subdomain, result }
        } catch (error) {
          console.error(`[v0] Failed to resolve ${subdomain}:`, error)
          return { subdomain, result: { ips: [], isUnresolved: true } }
        }
      })

      const batchResults = await Promise.all(promises)
      batchResults.forEach(({ subdomain, result }) => {
        results[subdomain] = result
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] IP resolution error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve IPs" },
      { status: 500 },
    )
  }
}

async function resolveSubdomain(subdomain: string): Promise<ResolveResult> {
  const result: ResolveResult = {
    ips: [],
    ipv6: [],
    nameservers: [],
    mxRecords: [],
    txtRecords: [],
    isUnresolved: false,
  }

  try {
    const [aRecords, aaaaRecords, nsRecords, mxRecords, txtRecords] = await Promise.allSettled([
      queryDNS(subdomain, "A"),
      queryDNS(subdomain, "AAAA"),
      queryDNS(subdomain, "NS"),
      queryDNS(subdomain, "MX"),
      queryDNS(subdomain, "TXT"),
    ])

    // Process A records (IPv4)
    if (aRecords.status === "fulfilled" && aRecords.value.Answer) {
      const cnameRecords = aRecords.value.Answer.filter((r: DNSRecord) => r.type === 5)
      if (cnameRecords.length > 0) {
        result.cname = cnameRecords[0].data
      }
      result.ips = aRecords.value.Answer.filter((r: DNSRecord) => r.type === 1).map((r: DNSRecord) => r.data)
    }

    // Process AAAA records (IPv6)
    if (aaaaRecords.status === "fulfilled" && aaaaRecords.value.Answer) {
      result.ipv6 = aaaaRecords.value.Answer.filter((r: DNSRecord) => r.type === 28).map((r: DNSRecord) => r.data)
    }

    // Process NS records (nameservers)
    if (nsRecords.status === "fulfilled" && nsRecords.value.Answer) {
      result.nameservers = nsRecords.value.Answer.filter((r: DNSRecord) => r.type === 2).map((r: DNSRecord) => r.data)
    }

    // Process MX records (mail servers)
    if (mxRecords.status === "fulfilled" && mxRecords.value.Answer) {
      result.mxRecords = mxRecords.value.Answer.filter((r: DNSRecord) => r.type === 15).map((r: DNSRecord) => r.data)
    }

    // Process TXT records
    if (txtRecords.status === "fulfilled" && txtRecords.value.Answer) {
      result.txtRecords = txtRecords.value.Answer.filter((r: DNSRecord) => r.type === 16).map((r: DNSRecord) => r.data)
    }

    // Check if completely unresolved
    result.isUnresolved =
      result.ips.length === 0 &&
      (result.ipv6?.length || 0) === 0 &&
      !result.cname &&
      (result.nameservers?.length || 0) === 0

    return result
  } catch (error) {
    console.error(`[v0] Failed to resolve ${subdomain}:`, error)
    return { ...result, isUnresolved: true }
  }
}

async function queryDNS(name: string, type: string): Promise<DNSResponse> {
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
