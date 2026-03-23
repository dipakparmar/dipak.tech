export type ParsedInputType = "ipv4" | "ipv6" | "asn" | "cidr" | "domain" | "unknown"

export type ParsedInput = {
  type: ParsedInputType
  value: string
  original: string
  confidence: "exact" | "extracted"
}

export type RDAPNetworkInfo = {
  name: string
  handle: string
  cidr: string
  startAddress: string
  endAddress: string
  registrant: string
  abuseContact?: string
  registrationDate?: string
  lastChanged?: string
  status: string[]
}

export type BGPRoutingInfo = {
  prefix: string
  origin_asn: string
  origin_asname: string
  as_path?: string[][]
  peers?: Array<{ asn: string; name: string; type: "upstream" | "downstream" | "peer" }>
  visibility: number
  rpki_status?: "valid" | "invalid" | "not-found"
}

export type ASNDetail = {
  asn: string
  name: string
  description: string
  country: string
  rir: string
  prefixes_v4: Array<{ prefix: string; name: string }>
  prefixes_v6: Array<{ prefix: string; name: string }>
  peers_count: number
  upstreams: Array<{ asn: string; name: string }>
  downstreams: Array<{ asn: string; name: string }>
}

export type NetworkIntelResponse = {
  query: string
  query_type: "ipv4" | "ipv6" | "asn" | "cidr"
  rdap?: RDAPNetworkInfo
  nameservers?: string[]
  bgp?: BGPRoutingInfo
  asn_detail?: ASNDetail
  errors?: Array<{ source: "rdap" | "ripestat" | "bgpview"; message: string }>
}
