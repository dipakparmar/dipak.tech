const RIPESTAT_BASE = "https://stat.ripe.net/data"
const BGPVIEW_BASE = "https://api.bgpview.io"
const TIMEOUT_MS = 8000

function stripASPrefix(asn: string): string {
  return asn.replace(/^AS/i, "")
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// RIPEstat functions
// ---------------------------------------------------------------------------

interface RIPEBGPStateResponse {
  data: {
    bgp_state: Array<{ path: string[]; target_prefix: string }>
    nr_routes: number
    resource: string
  }
}

export interface BGPStateResult {
  prefix: string
  origin_asn: string
  as_path: string[][]
  visibility: number
}

export async function getRIPEBGPState(
  resource: string
): Promise<BGPStateResult | null> {
  const url = `${RIPESTAT_BASE}/bgp-state/data.json?resource=${encodeURIComponent(resource)}`
  const data = await fetchJSON<RIPEBGPStateResponse>(url)
  if (!data?.data?.bgp_state) return null

  const states = data.data.bgp_state
  if (states.length === 0) return null

  const pathSet = new Set<string>()
  const paths: string[][] = []
  for (const state of states) {
    if (!state.path || state.path.length === 0) continue
    const key = state.path.join(",")
    if (!pathSet.has(key)) {
      pathSet.add(key)
      paths.push(state.path)
    }
    if (paths.length >= 10) break
  }

  const originAsn =
    paths.length > 0 ? paths[0][paths.length > 0 ? paths[0].length - 1 : 0] : ""

  const visibility =
    data.data.nr_routes > 0
      ? Math.round((states.length / data.data.nr_routes) * 100)
      : states.length > 0
        ? 100
        : 0

  return {
    prefix: data.data.resource || resource,
    origin_asn: originAsn,
    as_path: paths,
    visibility: Math.min(visibility, 100),
  }
}

interface RIPERPKIResponse {
  data: {
    status: string
    validating_roas: unknown[]
  }
}

export interface RPKIValidationResult {
  status: "valid" | "invalid" | "not-found"
}

export async function getRIPERPKIValidation(
  asn: string,
  prefix: string
): Promise<RPKIValidationResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/rpki-validation/data.json?resource=${encodeURIComponent(cleanAsn)}&prefix=${encodeURIComponent(prefix)}`
  const data = await fetchJSON<RIPERPKIResponse>(url)
  if (!data?.data) return null

  const status = data.data.status?.toLowerCase()
  if (status === "valid") return { status: "valid" }
  if (status === "invalid") return { status: "invalid" }
  return { status: "not-found" }
}

interface RIPEAnnouncedPrefixesResponse {
  data: {
    prefixes: Array<{
      prefix: string
      timelines: Array<{ starttime: string; endtime: string }>
    }>
  }
}

export interface AnnouncedPrefix {
  prefix: string
  timelines: Array<{ starttime: string; endtime: string }>
}

export async function getRIPEAnnouncedPrefixes(
  asn: string
): Promise<AnnouncedPrefix[] | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/announced-prefixes/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<RIPEAnnouncedPrefixesResponse>(url)
  if (!data?.data?.prefixes) return null

  return data.data.prefixes.map((p) => ({
    prefix: p.prefix,
    timelines: p.timelines || [],
  }))
}

interface RIPEASOverviewResponse {
  data: {
    holder: string
    announced: boolean
    block: { desc: string; name: string }
    resource: string
  }
}

export interface ASOverviewResult {
  name: string
  description: string
  country: string
}

export async function getRIPEASOverview(
  asn: string
): Promise<ASOverviewResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/as-overview/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<RIPEASOverviewResponse>(url)
  if (!data?.data) return null

  return {
    name: data.data.holder || "",
    description: data.data.block?.desc || "",
    country: "",
  }
}

interface RIPEPeersResponse {
  data: {
    neighbours: Array<{
      asn: number
      type: "left" | "right"
    }>
  }
}

export interface ASPeer {
  asn: string
  name: string
  type: "left" | "right"
}

export async function getRIPEPeers(asn: string): Promise<ASPeer[] | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/asn-neighbours/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<RIPEPeersResponse>(url)
  if (!data?.data?.neighbours) return null

  return data.data.neighbours.map((n) => ({
    asn: String(n.asn),
    name: "",
    type: n.type,
  }))
}

interface RIPELookingGlassResponse {
  data: {
    rrcs: Array<{
      rrc: string
      peers: Array<{
        asn_origin: number
        as_path: string
        community: string
        peer: string
      }>
    }>
  }
}

export interface LookingGlassEntry {
  rrc: string
  peer: string
  as_path: string[]
}

export async function getRIPELookingGlass(
  prefix: string
): Promise<LookingGlassEntry[] | null> {
  const url = `${RIPESTAT_BASE}/looking-glass/data.json?resource=${encodeURIComponent(prefix)}`
  const data = await fetchJSON<RIPELookingGlassResponse>(url)
  if (!data?.data?.rrcs) return null

  const results: LookingGlassEntry[] = []
  for (const rrc of data.data.rrcs) {
    for (const peer of rrc.peers) {
      results.push({
        rrc: rrc.rrc,
        peer: peer.peer,
        as_path: peer.as_path ? peer.as_path.split(" ") : [],
      })
      if (results.length >= 20) return results
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// BGPView functions
// ---------------------------------------------------------------------------

interface BGPViewResponse<T> {
  status: string
  data: T
}

export interface BGPViewASNResult {
  asn: number
  name: string
  description_short: string
  country_code: string
  rir_allocation: { rir_name: string }
}

export async function getBGPViewASN(
  asn: string
): Promise<BGPViewASNResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${BGPVIEW_BASE}/asn/${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<BGPViewResponse<BGPViewASNResult>>(url)
  if (!data?.data) return null

  return {
    asn: data.data.asn,
    name: data.data.name || "",
    description_short: data.data.description_short || "",
    country_code: data.data.country_code || "",
    rir_allocation: {
      rir_name: data.data.rir_allocation?.rir_name || "",
    },
  }
}

interface BGPViewPrefixEntry {
  prefix: string
  name: string
}

export interface BGPViewASNPrefixesResult {
  ipv4_prefixes: Array<{ prefix: string; name: string }>
  ipv6_prefixes: Array<{ prefix: string; name: string }>
}

export async function getBGPViewASNPrefixes(
  asn: string
): Promise<BGPViewASNPrefixesResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${BGPVIEW_BASE}/asn/${encodeURIComponent(cleanAsn)}/prefixes`
  const data = await fetchJSON<
    BGPViewResponse<{
      ipv4_prefixes: BGPViewPrefixEntry[]
      ipv6_prefixes: BGPViewPrefixEntry[]
    }>
  >(url)
  if (!data?.data) return null

  return {
    ipv4_prefixes: (data.data.ipv4_prefixes || []).map((p) => ({
      prefix: p.prefix,
      name: p.name || "",
    })),
    ipv6_prefixes: (data.data.ipv6_prefixes || []).map((p) => ({
      prefix: p.prefix,
      name: p.name || "",
    })),
  }
}

interface BGPViewPeerEntry {
  asn: number
  name: string
}

export interface BGPViewASNPeersResult {
  peers: Array<{ asn: number; name: string }>
  upstreams: Array<{ asn: number; name: string }>
  downstreams: Array<{ asn: number; name: string }>
}

export async function getBGPViewASNPeers(
  asn: string
): Promise<BGPViewASNPeersResult | null> {
  const cleanAsn = stripASPrefix(asn)

  const [peersData, upstreamsData, downstreamsData] = await Promise.all([
    fetchJSON<BGPViewResponse<{ ipv4_peers: BGPViewPeerEntry[]; ipv6_peers: BGPViewPeerEntry[] }>>(
      `${BGPVIEW_BASE}/asn/${encodeURIComponent(cleanAsn)}/peers`
    ),
    fetchJSON<BGPViewResponse<{ ipv4_upstreams: BGPViewPeerEntry[]; ipv6_upstreams: BGPViewPeerEntry[] }>>(
      `${BGPVIEW_BASE}/asn/${encodeURIComponent(cleanAsn)}/upstreams`
    ),
    fetchJSON<BGPViewResponse<{ ipv4_downstreams: BGPViewPeerEntry[]; ipv6_downstreams: BGPViewPeerEntry[] }>>(
      `${BGPVIEW_BASE}/asn/${encodeURIComponent(cleanAsn)}/downstreams`
    ),
  ])

  const mapEntries = (entries: BGPViewPeerEntry[] | undefined) =>
    (entries || []).map((e) => ({ asn: e.asn, name: e.name || "" }))

  const peers = [
    ...mapEntries(peersData?.data?.ipv4_peers),
    ...mapEntries(peersData?.data?.ipv6_peers),
  ]

  const upstreams = [
    ...mapEntries(upstreamsData?.data?.ipv4_upstreams),
    ...mapEntries(upstreamsData?.data?.ipv6_upstreams),
  ]

  const downstreams = [
    ...mapEntries(downstreamsData?.data?.ipv4_downstreams),
    ...mapEntries(downstreamsData?.data?.ipv6_downstreams),
  ]

  if (!peersData && !upstreamsData && !downstreamsData) return null

  return { peers, upstreams, downstreams }
}

export interface BGPViewPrefixResult {
  asns: Array<{ asn: number; name: string }>
  name: string
  description_short: string
}

export async function getBGPViewPrefix(
  prefix: string,
  length: number
): Promise<BGPViewPrefixResult | null> {
  const url = `${BGPVIEW_BASE}/prefix/${encodeURIComponent(prefix)}/${length}`
  const data = await fetchJSON<
    BGPViewResponse<{
      asns: Array<{ asn: number; name: string; description: string }>
      name: string
      description_short: string
    }>
  >(url)
  if (!data?.data) return null

  return {
    asns: (data.data.asns || []).map((a) => ({ asn: a.asn, name: a.name || "" })),
    name: data.data.name || "",
    description_short: data.data.description_short || "",
  }
}
