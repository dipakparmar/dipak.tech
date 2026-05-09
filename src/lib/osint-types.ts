export interface EmailSecurityResult {
  spf: {
    record: string | null
    policy: "fail" | "softfail" | "neutral" | "none"
  }
  dmarc: {
    record: string | null
    policy: "none" | "quarantine" | "reject"
    reporting: boolean
    pct: number
  }
  bimi: {
    present: boolean
    record: string | null
  }
}

export interface WAFResult {
  detected: boolean
  name: string | null
  capabilities: string[]
}

export interface TechStackResult {
  cdn: string[]
  framework: string[]
  cms: string[]
  analytics: string[]
  server: string[]
}

export interface SocialTagsResult {
  og: {
    title: string | null
    description: string | null
    image: string | null
    type: string | null
    siteName: string | null
  }
  twitter: {
    card: string | null
    site: string | null
    creator: string | null
  }
}

export interface CookieInfo {
  name: string
  domain: string | null
  path: string | null
  secure: boolean
  httpOnly: boolean
  sameSite: "Strict" | "Lax" | "None" | null
  expires: string | null
}

export interface RedirectHop {
  url: string
  status: number
  latencyMs: number
}

export interface SecurityData {
  dnssec: {
    enabled: boolean
    algorithm: string | null
  }
  dkim: {
    selectors: string[]
  }
  blocklist: {
    total: number
    clean: number
    results: Array<{ name: string; listed: boolean }>
  }
}

export interface IdentityData {
  securityTxt: {
    found: boolean
    contact: string | null
    expires: string | null
    policy: string | null
    encryption: string | null
    acknowledgments: string | null
    hiring: string | null
    bugBounty: boolean
  }
}

export interface ShodanHostInfo {
  ip: string
  ports: number[]
  vulns: string[]
  tags: string[]
}

export interface ThreatData {
  shodan: ShodanHostInfo[]
  wayback: {
    available: boolean
    firstSeen: string | null
    lastArchived: string | null
    latestUrl: string | null
    approximateCount: number | null
  }
  crawl: {
    robots: {
      found: boolean
      disallowCount: number
      userAgentCount: number
      sitemapUrls: string[]
    }
    sitemap: {
      found: boolean
      urlCount: number
      lastModified: string | null
    }
  }
}
