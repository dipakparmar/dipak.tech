export interface EmailSecurityResult {
  spf: {
    record: string | null;
    policy: 'fail' | 'softfail' | 'neutral' | 'none' | 'pass';
  };
  dmarc: {
    record: string | null;
    policy: 'none' | 'quarantine' | 'reject';
    reporting: boolean;
    pct: number;
  };
  bimi: {
    present: boolean;
    record: string | null;
  };
}

export interface WAFResult {
  detected: boolean;
  name: string | null;
  capabilities: string[];
}

export interface TechStackResult {
  cdn: string[];
  framework: string[];
  cms: string[];
  analytics: string[];
  server: string[];
}

export interface SocialTagsResult {
  og: {
    title: string | null;
    description: string | null;
    image: string | null;
    imageProxySrc: string | null;
    type: string | null;
    siteName: string | null;
  };
  twitter: {
    card: string | null;
    site: string | null;
    creator: string | null;
  };
}

export interface CookieInfo {
  name: string;
  domain: string | null;
  path: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | null;
  expires: string | null;
}

export interface RedirectHop {
  url: string;
  status: number;
  latencyMs: number;
}

export interface SecurityData {
  dnssec: {
    enabled: boolean;
    algorithm: string | null;
  };
  dkim: {
    selectors: string[];
    wildcard: boolean;
  };
  blocklist: {
    total: number;
    clean: number;
    results: Array<{ name: string; listed: boolean }>;
  };
}

export interface IdentityData {
  securityTxt: {
    found: boolean;
    contact: string | null;
    expires: string | null;
    policy: string | null;
    encryption: string | null;
    acknowledgments: string | null;
    hiring: string | null;
    bugBounty: boolean;
  };
}

export interface SubdomainDns {
  /** `skipped`: beyond the per-scan resolve limit. `error`: resolver failed, state unknown. */
  status: 'resolved' | 'nxdomain' | 'noanswer' | 'error' | 'skipped';
  ips: string[];
  cname: string | null;
}

export interface SubdomainEntry {
  host: string;
  /** Seen as `*.host` in a certificate. */
  wildcard: boolean;
  certs: number;
  firstSeen: string | null;
  lastExpiry: string | null;
  /** Has a certificate that has not expired yet. */
  active: boolean;
  dns: SubdomainDns;
}

export interface CertificateData {
  target: string;
  source: 'certkit' | 'crt.sh';
  /** Certificates the CT source knows about. */
  totalCerts: number;
  /** Certificates actually fetched and analysed (capped). */
  scannedCerts: number;
  issuers: Array<{ name: string; count: number }>;
  latestExpiry: string | null;
  subdomains: SubdomainEntry[];
  resolveLimit: number;
}

export interface ShodanHostInfo {
  ip: string;
  ports: number[];
  vulns: string[];
  tags: string[];
}

export interface ThreatData {
  shodan: ShodanHostInfo[];
  wayback: {
    available: boolean;
    firstSeen: string | null;
    lastArchived: string | null;
    latestUrl: string | null;
    approximateCount: number | null;
  };
  crawl: {
    robots: {
      found: boolean;
      disallowCount: number;
      userAgentCount: number;
      sitemapUrls: string[];
    };
    sitemap: {
      found: boolean;
      urlCount: number;
      lastModified: string | null;
    };
  };
}
