"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, Eye, Shield, Calendar, Building, Globe, Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buildHref, normalizePathname } from "@/lib/host-routing"

interface CertEntry {
  serialNumber: string
  commonName: string
  issuerOrganization: string
  issuerCommonName: string
  dnsNames: string[]
  notBefore: string
  notAfter: string
  isWildcard: boolean
  isPrecert: boolean
  insertedTime: string
}

interface SearchResponse {
  timeTakenMs: number
  totalCount: number
  results: CertEntry[]
}

interface CTLogsViewerProps {
  initialDomain?: string
}

export function CTLogsViewer({ initialDomain = "" }: CTLogsViewerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialDomain)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<CertEntry[] | null>(null)
  const [stats, setStats] = useState<{ total: number; timeTaken: number; issuers: string[]; names: string[] } | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const hasAutoSearched = useRef(false)

  // Update URL with domain param (preserves search state on navigation)
  const updateUrlWithDomain = useCallback(
    (domain: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (domain.trim()) {
        params.set("domain", domain.trim())
      } else {
        params.delete("domain")
      }
      const queryString = params.toString()
      const host = typeof window === "undefined" ? "" : window.location.host
      const resolvedPath = normalizePathname('tools', pathname, host)
      router.replace(`${resolvedPath}${queryString ? `?${queryString}` : ""}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const handleShareUrl = useCallback(async () => {
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set("domain", query.trim())
    const host = window.location.host
    const resolvedPath = normalizePathname('tools', pathname, host)
    const url = `${window.location.origin}${resolvedPath}?${params.toString()}`
    await navigator.clipboard.writeText(url)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }, [query, pathname])

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery ?? query
    if (!q.trim()) {
      setError("Please enter a domain to search")
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)
    setStats(null)

    // Update URL with current search query
    updateUrlWithDomain(q)

    try {
      const response = await fetch("https://ct.certkit.io/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          domain: q.trim(),
          sort: "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch certificate logs")
      }

      const data: SearchResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        setError("No certificates found for this domain")
        return
      }

      // Calculate stats
      const issuers = [...new Set(data.results.map((c) => c.issuerOrganization).filter(Boolean))]
      const names = [...new Set(data.results.flatMap((c) => c.dnsNames))]

      setResults(data.results.slice(0, 100)) // Limit to 100 for performance
      setStats({
        total: data.totalCount,
        timeTaken: data.timeTakenMs,
        issuers: issuers.slice(0, 5),
        names: names.slice(0, 20),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search certificate logs")
    } finally {
      setLoading(false)
    }
  }, [query, updateUrlWithDomain])

  // Auto-search if initial domain is provided
  useEffect(() => {
    if (initialDomain && !hasAutoSearched.current) {
      hasAutoSearched.current = true
      handleSearch(initialDomain)
    }
  }, [initialDomain, handleSearch])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const isExpired = (notAfter: string) => new Date(notAfter) < new Date()
  const isExpiringSoon = (notAfter: string) => {
    const expiry = new Date(notAfter)
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    return expiry < thirtyDays && expiry > new Date()
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-cyan-500" />
            Certificate Transparency Search
          </CardTitle>
          <CardDescription>
            Search Certificate Transparency logs for certificates issued to a domain. Discover subdomains and monitor
            certificate issuance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="example.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 font-mono"
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleShareUrl}
              disabled={!query.trim()}
              title="Copy share URL"
            >
              {urlCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">
                Certificates Found
                <span className="ml-2 text-xs">({stats.timeTaken}ms)</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.issuers.length}</div>
              <p className="text-sm text-muted-foreground">Unique Issuers</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {stats.issuers.map((issuer) => (
                  <Badge key={issuer} variant="outline" className="text-xs">
                    {issuer}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.names.length}</div>
              <p className="text-sm text-muted-foreground">Unique Names</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {stats.names.slice(0, 8).map((name) => (
                  <Badge key={name} variant="secondary" className="font-mono text-xs">
                    {name}
                  </Badge>
                ))}
                {stats.names.length > 8 && (
                  <Badge variant="secondary" className="text-xs">
                    +{stats.names.length - 8}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="mt-2 h-4 w-48" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Showing {results.length} of {stats?.total.toLocaleString()} certificates
          </h3>
          {results.map((cert) => (
            <Card key={cert.serialNumber} className="transition-colors hover:border-cyan-500/30">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Common Name */}
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0 text-cyan-500" />
                      <code className="break-all font-mono text-sm font-medium">{cert.commonName}</code>
                      {cert.isWildcard && (
                        <Badge variant="outline" className="text-xs">
                          Wildcard
                        </Badge>
                      )}
                      {cert.isPrecert && (
                        <Badge variant="secondary" className="text-xs">
                          Precert
                        </Badge>
                      )}
                    </div>

                    {/* SANs */}
                    {cert.dnsNames && cert.dnsNames.length > 1 && (
                      <div className="flex items-start gap-2">
                        <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {cert.dnsNames.slice(0, 5).map((name) => (
                            <Badge key={name} variant="secondary" className="font-mono text-xs">
                              {name}
                            </Badge>
                          ))}
                          {cert.dnsNames.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{cert.dnsNames.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Issuer */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      <span>
                        {cert.issuerOrganization}
                        {cert.issuerCommonName && ` (${cert.issuerCommonName})`}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Issued: {formatDate(cert.notBefore)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Expires: {formatDate(cert.notAfter)}</span>
                        {isExpired(cert.notAfter) && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {isExpiringSoon(cert.notAfter) && (
                          <Badge variant="outline" className="border-amber-500 text-xs text-amber-500">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Serial */}
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Serial:</span>{" "}
                      <code className="font-mono">{cert.serialNumber}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <Link
                    href={buildHref('tools', `/certificates/view/${cert.serialNumber}`, typeof window === "undefined" ? "" : window.location.host)}
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
