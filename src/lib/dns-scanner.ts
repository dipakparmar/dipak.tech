// Core DNS reconnaissance engine with modular architecture

import type { CertificateEntry, ScanResult, SubdomainResult } from "@/types/network-ossint"

export class DNSScanner {
  private baseUrl = "https://crt.sh"

  /**
   * Discover subdomains using Certificate Transparency logs
   */
  async discoverSubdomains(domain: string): Promise<ScanResult> {
    const startTime = Date.now()

    try {
      // Query CRT.sh API for certificate transparency logs
      const certificates = await this.queryCertificateTransparency(domain)

      // Process and deduplicate subdomains
      const subdomains = this.processSubdomains(certificates)

      const scanDuration = Date.now() - startTime

      return {
        domain,
        timestamp: new Date().toISOString(),
        totalSubdomains: certificates.length,
        uniqueSubdomains: subdomains.length,
        subdomains,
        scanDuration,
      }
    } catch (error) {
      console.error("[v0] DNS scan error:", error)
      throw new Error(`Failed to scan domain: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Query Certificate Transparency logs via CRT.sh API
   */
  private async queryCertificateTransparency(domain: string): Promise<CertificateEntry[]> {
    const url = `${this.baseUrl}/json?q=${encodeURIComponent(domain)}`

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`CRT.sh API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  /**
   * Process and deduplicate subdomains from certificate entries
   */
  private processSubdomains(certificates: CertificateEntry[]): SubdomainResult[] {
    const subdomainMap = new Map<string, SubdomainResult>()

    for (const cert of certificates) {
      const domains = cert.name_value.split("\n").map((d) => d.trim().toLowerCase())

      for (const domain of domains) {
        let subdomain = domain
        let hasWildcard = false

        if (domain.startsWith("*.")) {
          subdomain = domain.substring(2) // Remove "*." prefix
          hasWildcard = true
        }

        // Skip invalid entries
        if (!subdomain.includes(".") || subdomain.length === 0) {
          continue
        }

        const existing = subdomainMap.get(subdomain)
        const certDate = new Date(cert.not_before)
        const expiryDate = new Date(cert.not_after)
        const now = new Date()

        // Determine certificate status
        const status = expiryDate < now ? "expired" : "active"

        if (!existing) {
          subdomainMap.set(subdomain, {
            subdomain,
            firstSeen: cert.entry_timestamp,
            lastSeen: cert.entry_timestamp,
            certificateCount: 1,
            issuer: this.extractIssuerName(cert.issuer_name),
            status,
            hasWildcard,
          })
        } else {
          // Update with latest information
          const existingFirst = new Date(existing.firstSeen)
          const existingLast = new Date(existing.lastSeen)
          const currentDate = new Date(cert.entry_timestamp)

          existing.certificateCount++

          if (hasWildcard) {
            existing.hasWildcard = true
          }

          if (currentDate < existingFirst) {
            existing.firstSeen = cert.entry_timestamp
          }
          if (currentDate > existingLast) {
            existing.lastSeen = cert.entry_timestamp
            existing.issuer = this.extractIssuerName(cert.issuer_name)
            existing.status = status
          }
        }
      }
    }

    // Convert to array and sort by subdomain name
    return Array.from(subdomainMap.values()).sort((a, b) => a.subdomain.localeCompare(b.subdomain))
  }

  /**
   * Extract readable issuer name from certificate issuer string
   */
  private extractIssuerName(issuerString: string): string {
    const cnMatch = issuerString.match(/CN=([^,]+)/)
    return cnMatch ? cnMatch[1] : issuerString
  }
}

// Singleton instance for reuse
export const dnsScanner = new DNSScanner()
