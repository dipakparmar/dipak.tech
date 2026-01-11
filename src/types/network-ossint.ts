// Core types for DNS reconnaissance

export interface CertificateEntry {
  issuer_ca_id: number
  issuer_name: string
  common_name: string
  name_value: string
  id: number
  entry_timestamp: string
  not_before: string
  not_after: string
  serial_number: string
  result_count: number
}

export interface SubdomainResult {
  subdomain: string
  firstSeen: string
  lastSeen: string
  certificateCount: number
  issuer: string
  status?: "active" | "expired" | "unknown"
  ipAddresses?: string[]
  ipv6Addresses?: string[]
  hasWildcard?: boolean
  cname?: string
  nameservers?: string[]
  mxRecords?: string[]
  txtRecords?: string[]
  isUnresolved?: boolean
}

export interface ScanResult {
  domain: string
  timestamp: string
  totalSubdomains: number
  uniqueSubdomains: number
  subdomains: SubdomainResult[]
  scanDuration: number
}

export interface TechnologyInfo {
  subdomain: string
  server?: string
  framework?: string
  hosting?: string
  technologies: string[]
}

export interface NetworkNode {
  id: string
  type: "domain" | "ip" | "ipv6" | "cname" | "nameserver" | "mx" | "txt" | "unresolved"
  label: string
  data: {
    subdomain?: string
    ipAddress?: string
    ipv6Address?: string
    cname?: string
    nameserver?: string
    mxRecord?: string
    txtRecord?: string
    connections: number
    isUnresolved?: boolean
  }
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
}

export interface NetworkGraphData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

export interface DNSRecords {
  ips: string[]
  ipv6?: string[]
  cname?: string
  nameservers?: string[]
  mxRecords?: string[]
  txtRecords?: string[]
  isUnresolved: boolean
}
