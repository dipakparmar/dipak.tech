const RIPESTAT_BASE = "https://stat.ripe.net/data"
const TIMEOUT_MS = 8000

function stripASPrefix(asn: string | number): string {
  return String(asn).replace(/^AS/i, "")
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
// BGP State
// ---------------------------------------------------------------------------

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
  const data = await fetchJSON<{
    data: {
      bgp_state: Array<{ path: string[]; target_prefix: string }>
      nr_routes: number
      resource: string
    }
  }>(url)
  if (!data?.data?.bgp_state) return null

  const states = data.data.bgp_state
  if (states.length === 0) return null

  const pathSet: Record<string, true> = {}
  const paths: string[][] = []
  for (const state of states) {
    if (!state.path || state.path.length === 0) continue
    const key = state.path.join(",")
    if (!pathSet[key]) {
      pathSet[key] = true
      paths.push(state.path)
    }
    if (paths.length >= 10) break
  }

  const originAsn =
    paths.length > 0 ? paths[0][paths[0].length - 1] : ""

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

// ---------------------------------------------------------------------------
// RPKI Validation
// ---------------------------------------------------------------------------

export interface RPKIValidationResult {
  status: "valid" | "invalid" | "not-found"
}

export async function getRIPERPKIValidation(
  asn: string,
  prefix: string
): Promise<RPKIValidationResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/rpki-validation/data.json?resource=${encodeURIComponent(cleanAsn)}&prefix=${encodeURIComponent(prefix)}`
  const data = await fetchJSON<{ data: { status: string } }>(url)
  if (!data?.data) return null

  const status = data.data.status?.toLowerCase()
  if (status === "valid") return { status: "valid" }
  if (status === "invalid") return { status: "invalid" }
  return { status: "not-found" }
}

// ---------------------------------------------------------------------------
// Announced Prefixes
// ---------------------------------------------------------------------------

export interface AnnouncedPrefix {
  prefix: string
  timelines: Array<{ starttime: string; endtime: string }>
}

export async function getRIPEAnnouncedPrefixes(
  asn: string
): Promise<AnnouncedPrefix[] | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/announced-prefixes/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<{
    data: { prefixes: Array<{ prefix: string; timelines: Array<{ starttime: string; endtime: string }> }> }
  }>(url)
  if (!data?.data?.prefixes) return null

  return data.data.prefixes.map((p) => ({
    prefix: p.prefix,
    timelines: p.timelines || [],
  }))
}

// ---------------------------------------------------------------------------
// AS Overview (name, holder, RIR block)
// ---------------------------------------------------------------------------

export interface ASOverviewResult {
  name: string
  description: string
  rir: string
}

export async function getRIPEASOverview(
  asn: string
): Promise<ASOverviewResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/as-overview/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<{
    data: {
      holder: string
      block: { desc: string; name: string }
      resource: string
    }
  }>(url)
  if (!data?.data) return null

  // Extract RIR from block.desc (e.g., "Assigned by ARIN")
  const blockDesc = data.data.block?.desc || ""
  const rirMatch = blockDesc.match(/(?:Assigned|Allocated) by (\S+)/i)
  const rir = rirMatch ? rirMatch[1] : ""

  return {
    name: data.data.holder || "",
    description: blockDesc,
    rir,
  }
}

// ---------------------------------------------------------------------------
// ASN Whois (country, source/RIR)
// ---------------------------------------------------------------------------

export interface ASWhoisResult {
  country: string
  rir: string
}

export async function getRIPEASWhois(
  asn: string
): Promise<ASWhoisResult | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/whois/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<{
    data: {
      records: Array<Array<{ key: string; value: string }>>
    }
  }>(url)
  if (!data?.data?.records) return null

  let country = ""
  let rir = ""

  for (const record of data.data.records) {
    for (const field of record) {
      if (field.key === "Country" || field.key === "country") {
        country = field.value
      }
      if (field.key === "source") {
        rir = field.value
      }
    }
  }

  return { country, rir }
}

// ---------------------------------------------------------------------------
// ASN Neighbours (peers/upstreams/downstreams)
// ---------------------------------------------------------------------------

export interface ASPeer {
  asn: string
  name: string
  type: "left" | "right"
}

export async function getRIPEPeers(asn: string): Promise<ASPeer[] | null> {
  const cleanAsn = stripASPrefix(asn)
  const url = `${RIPESTAT_BASE}/asn-neighbours/data.json?resource=AS${encodeURIComponent(cleanAsn)}`
  const data = await fetchJSON<{
    data: { neighbours: Array<{ asn: number; type: "left" | "right" }> }
  }>(url)
  if (!data?.data?.neighbours) return null

  return data.data.neighbours.map((n) => ({
    asn: String(n.asn),
    name: "",
    type: n.type,
  }))
}

// ---------------------------------------------------------------------------
// Looking Glass
// ---------------------------------------------------------------------------

export interface LookingGlassEntry {
  rrc: string
  peer: string
  as_path: string[]
}

export async function getRIPELookingGlass(
  prefix: string
): Promise<LookingGlassEntry[] | null> {
  const url = `${RIPESTAT_BASE}/looking-glass/data.json?resource=${encodeURIComponent(prefix)}`
  const data = await fetchJSON<{
    data: {
      rrcs: Array<{
        rrc: string
        peers: Array<{ peer: string; as_path: string }>
      }>
    }
  }>(url)
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
