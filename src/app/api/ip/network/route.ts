import { NextResponse } from "next/server"
import type { NetworkIntelResponse, RDAPNetworkInfo, BGPRoutingInfo, ASNDetail } from "@/types/network"
import { parseNetworkInput } from "@/lib/network-input-parser"
import { queryRDAP } from "@/lib/rdap"
import {
  getRIPEBGPState,
  getRIPERPKIValidation,
  getRIPEPeers,
  getBGPViewASN,
  getBGPViewASNPrefixes,
  getBGPViewASNPeers,
} from "@/lib/bgp"
import { getCached, setCached, checkRateLimit, getClientId, buildRateLimitHeaders } from "@/lib/osint-cache"
import { captureAPIError } from "@/lib/sentry-utils"

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const CACHE_TTL_MS = 10 * 60_000

// ---------------------------------------------------------------------------
// RDAP response helpers
// ---------------------------------------------------------------------------

function extractRDAPNetworkInfo(rdap: Record<string, unknown>): RDAPNetworkInfo {
  // CIDR
  let cidr = ""
  const cidr0 = rdap.cidr0_cidrs as Array<{ v4prefix?: string; v6prefix?: string; length?: number }> | undefined
  if (cidr0 && cidr0.length > 0) {
    const first = cidr0[0]
    const prefix = first.v4prefix || first.v6prefix || ""
    cidr = first.length !== undefined ? `${prefix}/${first.length}` : prefix
  }

  // Registrant from entities with vcard
  let registrant = ""
  let abuseContact: string | undefined
  const entities = rdap.entities as Array<Record<string, unknown>> | undefined
  if (entities) {
    for (const entity of entities) {
      const roles = entity.roles as string[] | undefined
      const vcardArray = entity.vcardArray as [string, Array<[string, Record<string, unknown>, string, string]>] | undefined
      const fn = vcardArray?.[1]?.find((field) => field[0] === "fn")?.[3] || ""

      if (roles?.includes("registrant") && fn) {
        registrant = fn
      }
      if (roles?.includes("abuse") && fn) {
        abuseContact = fn
        // Also try to find abuse email
        const email = vcardArray?.[1]?.find((field) => field[0] === "email")?.[3]
        if (email) abuseContact = email
      }
      if (!registrant && fn) {
        registrant = fn
      }
    }
  }

  // Events
  let registrationDate: string | undefined
  let lastChanged: string | undefined
  const events = rdap.events as Array<{ eventAction: string; eventDate: string }> | undefined
  if (events) {
    for (const event of events) {
      if (event.eventAction === "registration") registrationDate = event.eventDate
      if (event.eventAction === "last changed") lastChanged = event.eventDate
    }
  }

  return {
    name: (rdap.name as string) || "",
    handle: (rdap.handle as string) || "",
    cidr,
    startAddress: (rdap.startAddress as string) || "",
    endAddress: (rdap.endAddress as string) || "",
    registrant,
    abuseContact,
    registrationDate,
    lastChanged,
    status: (rdap.status as string[]) || [],
  }
}

function extractNameservers(rdap: Record<string, unknown>): string[] {
  const nameservers = rdap.nameservers as Array<{ ldhName?: string }> | undefined
  if (!nameservers) return []
  return nameservers.map((ns) => ns.ldhName || "").filter(Boolean)
}

// ---------------------------------------------------------------------------
// IP / CIDR query handler
// ---------------------------------------------------------------------------

async function handleIPQuery(
  query: string,
  queryType: "ipv4" | "ipv6" | "cidr"
): Promise<NetworkIntelResponse> {
  const errors: NetworkIntelResponse["errors"] = []

  const rdapType = queryType === "cidr" ? (query.includes(":") ? "ipv6" : "ipv4") : queryType

  // Step 1: RDAP + BGP state in parallel
  const [rdapResult, bgpStateResult] = await Promise.allSettled([
    queryRDAP(query, rdapType),
    getRIPEBGPState(query),
  ])

  // Process RDAP
  let rdap: RDAPNetworkInfo | undefined
  let nameservers: string[] | undefined
  if (rdapResult.status === "fulfilled") {
    rdap = extractRDAPNetworkInfo(rdapResult.value)
    const ns = extractNameservers(rdapResult.value)
    if (ns.length > 0) nameservers = ns
  } else {
    errors.push({ source: "rdap", message: rdapResult.reason?.message || "RDAP lookup failed" })
  }

  // Process BGP state
  let bgp: BGPRoutingInfo | undefined
  const bgpState = bgpStateResult.status === "fulfilled" ? bgpStateResult.value : null
  if (bgpStateResult.status === "rejected") {
    errors.push({ source: "ripestat", message: bgpStateResult.reason?.message || "BGP state lookup failed" })
  }

  if (bgpState) {
    bgp = {
      prefix: bgpState.prefix,
      origin_asn: bgpState.origin_asn,
      origin_asname: "",
      as_path: bgpState.as_path,
      visibility: bgpState.visibility,
    }

    // Step 2: RPKI validation, peers, and ASN name in parallel
    const [rpkiResult, peersResult, asnResult] = await Promise.allSettled([
      bgpState.origin_asn
        ? getRIPERPKIValidation(bgpState.origin_asn, bgpState.prefix)
        : Promise.resolve(null),
      bgpState.origin_asn
        ? getRIPEPeers(bgpState.origin_asn)
        : Promise.resolve(null),
      bgpState.origin_asn
        ? getBGPViewASN(bgpState.origin_asn)
        : Promise.resolve(null),
    ])

    if (rpkiResult.status === "fulfilled" && rpkiResult.value) {
      bgp.rpki_status = rpkiResult.value.status
    } else if (rpkiResult.status === "rejected") {
      errors.push({ source: "ripestat", message: "RPKI validation lookup failed" })
    }

    if (peersResult.status === "fulfilled" && peersResult.value) {
      bgp.peers = peersResult.value.map((p) => ({
        asn: p.asn,
        name: p.name,
        type: p.type === "left" ? ("upstream" as const) : ("peer" as const),
      }))
    } else if (peersResult.status === "rejected") {
      errors.push({ source: "ripestat", message: "Peers lookup failed" })
    }

    if (asnResult.status === "fulfilled" && asnResult.value) {
      bgp.origin_asname = asnResult.value.name
    } else if (asnResult.status === "rejected") {
      errors.push({ source: "bgpview", message: "ASN name lookup failed" })
    }
  }

  const response: NetworkIntelResponse = {
    query,
    query_type: queryType === "cidr" ? "cidr" : queryType,
  }
  if (rdap) response.rdap = rdap
  if (nameservers) response.nameservers = nameservers
  if (bgp) response.bgp = bgp
  if (errors.length > 0) response.errors = errors

  return response
}

// ---------------------------------------------------------------------------
// ASN query handler
// ---------------------------------------------------------------------------

async function handleASNQuery(query: string): Promise<NetworkIntelResponse> {
  const errors: NetworkIntelResponse["errors"] = []

  // Step 1: BGPView ASN detail + prefixes + peers in parallel
  const [asnResult, prefixesResult, peersResult] = await Promise.allSettled([
    getBGPViewASN(query),
    getBGPViewASNPrefixes(query),
    getBGPViewASNPeers(query),
  ])

  let asnDetail: ASNDetail | undefined

  const asnData = asnResult.status === "fulfilled" ? asnResult.value : null
  const prefixesData = prefixesResult.status === "fulfilled" ? prefixesResult.value : null
  const peersData = peersResult.status === "fulfilled" ? peersResult.value : null

  if (asnResult.status === "rejected") {
    errors.push({ source: "bgpview", message: asnResult.reason?.message || "ASN detail lookup failed" })
  }
  if (prefixesResult.status === "rejected") {
    errors.push({ source: "bgpview", message: prefixesResult.reason?.message || "ASN prefixes lookup failed" })
  }
  if (peersResult.status === "rejected") {
    errors.push({ source: "bgpview", message: peersResult.reason?.message || "ASN peers lookup failed" })
  }

  if (asnData || prefixesData || peersData) {
    asnDetail = {
      asn: asnData ? String(asnData.asn) : query,
      name: asnData?.name || "",
      description: asnData?.description_short || "",
      country: asnData?.country_code || "",
      rir: asnData?.rir_allocation?.rir_name || "",
      prefixes_v4: prefixesData?.ipv4_prefixes || [],
      prefixes_v6: prefixesData?.ipv6_prefixes || [],
      peers_count: peersData?.peers?.length || 0,
      upstreams: (peersData?.upstreams || []).map((u) => ({ asn: String(u.asn), name: u.name })),
      downstreams: (peersData?.downstreams || []).map((d) => ({ asn: String(d.asn), name: d.name })),
    }
  }

  // Step 2: Get BGP routing data for first announced IPv4 prefix
  let bgp: BGPRoutingInfo | undefined
  const firstV4Prefix = prefixesData?.ipv4_prefixes?.[0]?.prefix
  if (firstV4Prefix) {
    try {
      const bgpState = await getRIPEBGPState(firstV4Prefix)
      if (bgpState) {
        bgp = {
          prefix: bgpState.prefix,
          origin_asn: bgpState.origin_asn,
          origin_asname: asnData?.name || "",
          as_path: bgpState.as_path,
          visibility: bgpState.visibility,
        }

        // Get RPKI for this prefix
        const rpki = await getRIPERPKIValidation(bgpState.origin_asn, bgpState.prefix).catch(() => null)
        if (rpki) bgp.rpki_status = rpki.status
      }
    } catch {
      errors.push({ source: "ripestat", message: "BGP routing lookup for prefix failed" })
    }
  }

  const response: NetworkIntelResponse = {
    query,
    query_type: "asn",
  }
  if (asnDetail) response.asn_detail = asnDetail
  if (bgp) response.bgp = bgp
  if (errors.length > 0) response.errors = errors

  return response
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const url = new URL(request.url)
  const rawQuery = url.searchParams.get("query")

  if (!rawQuery) {
    return NextResponse.json({ error: "query parameter is required" }, { status: 400 })
  }

  // Rate limiting
  const clientId = getClientId(request.headers)
  const rateLimit = checkRateLimit(`network:${clientId}`, RATE_LIMIT, RATE_WINDOW_MS)
  const rateLimitHeaders = buildRateLimitHeaders(RATE_LIMIT, rateLimit)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rateLimitHeaders }
    )
  }

  // Parse input
  const parsed = parseNetworkInput(rawQuery)

  if (parsed.type === "unknown") {
    return NextResponse.json(
      {
        error:
          "Could not identify a valid IP, ASN, or prefix. Try an IP address (8.8.8.8), ASN (AS13335), or prefix (1.1.1.0/24).",
      },
      { status: 400, headers: rateLimitHeaders }
    )
  }

  if (parsed.type === "domain") {
    return NextResponse.json(
      { error: "Resolve the domain to an IP first using /api/ip?target=example.com" },
      { status: 400, headers: rateLimitHeaders }
    )
  }

  // Check cache
  const cacheKey = `network:${parsed.type}:${parsed.value}`
  const cached = getCached<NetworkIntelResponse>(cacheKey)
  if (cached) {
    return NextResponse.json(cached, { headers: rateLimitHeaders })
  }

  try {
    let result: NetworkIntelResponse

    if (parsed.type === "asn") {
      result = await handleASNQuery(parsed.value)
    } else {
      result = await handleIPQuery(parsed.value, parsed.type)
    }

    setCached(cacheKey, result, CACHE_TTL_MS)

    return NextResponse.json(result, { headers: rateLimitHeaders })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "network-intelligence" })
  }
}
