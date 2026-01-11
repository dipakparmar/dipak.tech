"use client"

import { Activity, AlertTriangle, Globe, Info, Lock, Network, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { WhoisResults } from "@/components/whois-results"

// Known security headers to filter out from regular headers
const SECURITY_HEADER_KEYS = new Set([
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "x-xss-protection",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
])

interface OsintResultsProps {
  rdapData: any | null
  dnsData: any | null
  httpData: any | null
  certData: any | null
  ipData: any | null
  query: string
  errors: {
    rdap?: string
    dns?: string
    http?: string
    certs?: string
    ip?: string
  }
  pending: Record<string, boolean>
  certDnsData?: Record<string, any> | null
  certDnsPending?: Record<string, boolean>
}

export function OsintResults({
  rdapData,
  dnsData,
  httpData,
  certData,
  ipData,
  query,
  errors,
  pending,
  certDnsData,
  certDnsPending,
}: OsintResultsProps) {
  // Determine which cards have content to show
  const hasHttp = httpData || pending.http
  const hasDns = dnsData || pending.dns
  const hasCerts = certData || pending.certs
  const hasIp = ipData || pending.ip
  const showNotApplicable = (key: string) => errors[key as keyof typeof errors] === "Not applicable for this query type"

  // Filter regular headers (exclude security headers to avoid duplication)
  const getRegularHeaders = (headers: Record<string, string> | undefined) => {
    if (!headers) return {}
    return Object.fromEntries(
      Object.entries(headers).filter(([key]) => !SECURITY_HEADER_KEYS.has(key.toLowerCase()))
    )
  }

  // Build DNS map data from certDnsData
  const buildDnsMap = () => {
    if (!certDnsData || Object.keys(certDnsData).length === 0) return null

    const ipToDomains: Record<string, string[]> = {}
    const domainToIps: Record<string, string[]> = {}
    const unresolved: string[] = []

    Object.entries(certDnsData).forEach(([domain, dns]: [string, any]) => {
      if (dns?.error || (!dns?.records?.A?.length && !dns?.records?.AAAA?.length)) {
        unresolved.push(domain)
        return
      }
      const ips = [...(dns?.records?.A || []), ...(dns?.records?.AAAA || [])]
      domainToIps[domain] = ips
      ips.forEach((ip: string) => {
        if (!ipToDomains[ip]) ipToDomains[ip] = []
        if (!ipToDomains[ip].includes(domain)) {
          ipToDomains[ip].push(domain)
        }
      })
    })

    return { ipToDomains, domainToIps, unresolved }
  }

  const dnsMap = buildDnsMap()

  return (
    <div className="space-y-8">
      {/* RDAP Section - Always full width */}
      <section>
        {rdapData ? (
          <WhoisResults data={rdapData} query={query} />
        ) : pending.rdap ? (
          <Card className="border-dashed">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                RDAP Unavailable
              </CardTitle>
              <CardDescription>{errors.rdap || "Unable to retrieve RDAP data for this target."}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      {/* OSINT Grid - Bento layout */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* DNS Footprint - spans 2 cols on xl */}
        {(hasDns || !showNotApplicable("dns")) && (
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4 text-blue-500" />
                DNS Footprint
              </CardTitle>
              <CardDescription>Core DNS records discovered via DoH</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main domain DNS */}
              {dnsData ? (
                <Tabs defaultValue="A" className="w-full">
                  <TabsList className="mb-4 flex h-auto flex-wrap gap-1 bg-transparent p-0">
                    {["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"].map((type) => (
                      <TabsTrigger
                        key={type}
                        value={type}
                        className="rounded-md border bg-muted/50 px-3 py-1.5 text-xs font-medium data-[state=active]:border-blue-500/50 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        {type}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(dnsData.records || {}).map(([type, values]) => (
                    <TabsContent key={type} value={type} className="mt-0">
                      {Array.isArray(values) && values.length > 0 ? (
                        <div className="space-y-1.5">
                          {values.map((value: string, idx: number) => (
                            <div
                              key={`${type}-${idx}`}
                              className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs"
                            >
                              {value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">No {type} records found</p>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : pending.dns ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {errors.dns || "DNS results not available"}
                </p>
              )}

              {/* DNS Map Diagram - Visual relationship between domains and IPs */}
              {dnsMap && Object.keys(dnsMap.domainToIps).length > 0 && (
                <div className="border-t pt-4">
                  <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    DNS Map · Infrastructure Diagram
                  </p>

                  {/* Visual Diagram */}
                  <div className="relative rounded-lg border bg-muted/10 p-4">
                    <div className="flex items-stretch justify-between gap-4">
                      {/* Domains Column */}
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="mb-2 text-center text-xs font-medium text-muted-foreground">DOMAINS</div>
                        {Object.keys(dnsMap.domainToIps).map((domain) => (
                          <div
                            key={domain}
                            className="group relative flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs transition-colors hover:border-blue-500/50 hover:bg-blue-500/10"
                          >
                            <code className="font-mono text-blue-600 dark:text-blue-400">{domain}</code>
                            <div className="absolute -right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
                          </div>
                        ))}
                      </div>

                      {/* Connection Lines - SVG */}
                      <div className="relative w-16 md:w-24">
                        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                          {(() => {
                            const domains = Object.keys(dnsMap.domainToIps)
                            const ips = Object.keys(dnsMap.ipToDomains)
                            const lines: Array<{ d1: number; i1: number; ip: string }> = []

                            // Color palette for different IPs - distinct, accessible colors
                            const ipColors = [
                              { stroke: "rgb(16, 185, 129)", name: "emerald" },   // emerald-500
                              { stroke: "rgb(59, 130, 246)", name: "blue" },      // blue-500
                              { stroke: "rgb(168, 85, 247)", name: "purple" },    // purple-500
                              { stroke: "rgb(249, 115, 22)", name: "orange" },    // orange-500
                              { stroke: "rgb(236, 72, 153)", name: "pink" },      // pink-500
                              { stroke: "rgb(234, 179, 8)", name: "yellow" },     // yellow-500
                              { stroke: "rgb(20, 184, 166)", name: "teal" },      // teal-500
                              { stroke: "rgb(239, 68, 68)", name: "red" },        // red-500
                              { stroke: "rgb(99, 102, 241)", name: "indigo" },    // indigo-500
                              { stroke: "rgb(34, 197, 94)", name: "green" },      // green-500
                            ]

                            // Map each IP to a color
                            const ipColorMap: Record<string, string> = {}
                            ips.forEach((ip, idx) => {
                              ipColorMap[ip] = ipColors[idx % ipColors.length].stroke
                            })

                            domains.forEach((domain, di) => {
                              dnsMap.domainToIps[domain].forEach((ip) => {
                                const ii = ips.indexOf(ip)
                                if (ii !== -1) {
                                  lines.push({ d1: di, i1: ii, ip })
                                }
                              })
                            })

                            return lines.map((line, idx) => {
                              const y1Percent = domains.length === 1 ? 50 : (line.d1 / (domains.length - 1)) * 100
                              const y2Percent = ips.length === 1 ? 50 : (line.i1 / (ips.length - 1)) * 100
                              const color = ipColorMap[line.ip]
                              return (
                                <line
                                  key={idx}
                                  x1="0%"
                                  y1={`${Math.max(10, Math.min(90, y1Percent))}%`}
                                  x2="100%"
                                  y2={`${Math.max(10, Math.min(90, y2Percent))}%`}
                                  stroke={color}
                                  strokeWidth="2"
                                  strokeOpacity="0.7"
                                  className="transition-all hover:stroke-[3] hover:opacity-100"
                                />
                              )
                            })
                          })()}
                        </svg>
                      </div>

                      {/* IPs Column */}
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="mb-2 text-center text-xs font-medium text-muted-foreground">IP ADDRESSES</div>
                        {(() => {
                          const sortedIps = Object.entries(dnsMap.ipToDomains).sort((a, b) => b[1].length - a[1].length)
                          const allIps = Object.keys(dnsMap.ipToDomains)

                          // Same color palette as lines
                          const ipColors = [
                            { bg: "bg-emerald-500", border: "border-emerald-500/30", hoverBorder: "hover:border-emerald-500/50", hoverBg: "hover:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", fill: "rgb(16, 185, 129)" },
                            { bg: "bg-blue-500", border: "border-blue-500/30", hoverBorder: "hover:border-blue-500/50", hoverBg: "hover:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", fill: "rgb(59, 130, 246)" },
                            { bg: "bg-purple-500", border: "border-purple-500/30", hoverBorder: "hover:border-purple-500/50", hoverBg: "hover:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", fill: "rgb(168, 85, 247)" },
                            { bg: "bg-orange-500", border: "border-orange-500/30", hoverBorder: "hover:border-orange-500/50", hoverBg: "hover:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", fill: "rgb(249, 115, 22)" },
                            { bg: "bg-pink-500", border: "border-pink-500/30", hoverBorder: "hover:border-pink-500/50", hoverBg: "hover:bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", fill: "rgb(236, 72, 153)" },
                            { bg: "bg-yellow-500", border: "border-yellow-500/30", hoverBorder: "hover:border-yellow-500/50", hoverBg: "hover:bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", fill: "rgb(234, 179, 8)" },
                            { bg: "bg-teal-500", border: "border-teal-500/30", hoverBorder: "hover:border-teal-500/50", hoverBg: "hover:bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", fill: "rgb(20, 184, 166)" },
                            { bg: "bg-red-500", border: "border-red-500/30", hoverBorder: "hover:border-red-500/50", hoverBg: "hover:bg-red-500/10", text: "text-red-600 dark:text-red-400", fill: "rgb(239, 68, 68)" },
                            { bg: "bg-indigo-500", border: "border-indigo-500/30", hoverBorder: "hover:border-indigo-500/50", hoverBg: "hover:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", fill: "rgb(99, 102, 241)" },
                            { bg: "bg-green-500", border: "border-green-500/30", hoverBorder: "hover:border-green-500/50", hoverBg: "hover:bg-green-500/10", text: "text-green-600 dark:text-green-400", fill: "rgb(34, 197, 94)" },
                          ]

                          return sortedIps.map(([ip, domains]) => {
                            const colorIdx = allIps.indexOf(ip) % ipColors.length
                            const colors = ipColors[colorIdx]
                            return (
                              <div
                                key={ip}
                                className={`group relative flex items-center justify-between rounded-md border bg-opacity-5 px-3 py-2 text-xs transition-colors ${colors.border} ${colors.hoverBorder} ${colors.hoverBg}`}
                                style={{ backgroundColor: `${colors.fill}10` }}
                              >
                                <div
                                  className={`absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${colors.bg}`}
                                />
                                <code className={`font-mono ${colors.text}`}>{ip}</code>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {domains.length}
                                </Badge>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                    {/* Unresolved domains */}
                    {dnsMap.unresolved.length > 0 && (
                      <div className="mt-4 border-t border-dashed pt-4">
                        <p className="mb-2 text-xs text-muted-foreground">Unresolved ({dnsMap.unresolved.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dnsMap.unresolved.map((domain) => (
                            <code
                              key={domain}
                              className="rounded border border-dashed px-2 py-1 font-mono text-xs text-muted-foreground"
                            >
                              {domain}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{Object.keys(dnsMap.domainToIps).length} domains</span>
                    <span>→</span>
                    <span>{Object.keys(dnsMap.ipToDomains).length} unique IPs</span>
                    {dnsMap.unresolved.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{dnsMap.unresolved.length} unresolved</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Show pending cert DNS lookups */}
              {certDnsPending && Object.values(certDnsPending).some(Boolean) && (
                <div className="border-t pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Resolving Certificate Domains...
                  </p>
                  <div className="space-y-2">
                    {Object.entries(certDnsPending)
                      .filter(([, isPending]) => isPending)
                      .slice(0, 3)
                      .map(([domain]) => (
                        <div key={domain} className="flex items-center gap-2">
                          <Skeleton className="h-6 w-24" />
                          <span className="font-mono text-xs text-muted-foreground">{domain}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* IP Intelligence */}
        {(hasIp || !showNotApplicable("ip")) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-emerald-500" />
                IP Intelligence
              </CardTitle>
              <CardDescription>Geo, ASN & network context</CardDescription>
            </CardHeader>
            <CardContent>
              {ipData ? (
                <div className="space-y-4">
                  {/* IP with flags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md border bg-muted/50 px-2 py-1 font-mono text-sm">{ipData.ip}</code>
                    {ipData.proxy && (
                      <Badge variant="destructive" className="text-xs">
                        Proxy
                      </Badge>
                    )}
                    {ipData.tor && (
                      <Badge variant="destructive" className="text-xs">
                        Tor
                      </Badge>
                    )}
                    {ipData.hosting && (
                      <Badge variant="secondary" className="text-xs">
                        Hosting
                      </Badge>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">
                      {[ipData.city, ipData.region, ipData.country].filter(Boolean).join(", ")}
                    </p>
                    {ipData.continent && <p className="text-xs text-muted-foreground">{ipData.continent}</p>}
                  </div>

                  {/* ASN */}
                  {ipData.connection && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Network</p>
                      <p className="text-sm font-medium">
                        {ipData.connection.asn} · {ipData.connection.org}
                      </p>
                      {ipData.connection.isp && (
                        <p className="text-xs text-muted-foreground">{ipData.connection.isp}</p>
                      )}
                    </div>
                  )}

                  {/* Reverse DNS */}
                  {ipData.reverse && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reverse DNS</p>
                      <p className="break-all font-mono text-xs">{ipData.reverse}</p>
                    </div>
                  )}

                  {/* Timezone */}
                  {ipData.timezone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      {ipData.timezone}
                    </div>
                  )}
                </div>
              ) : pending.ip ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {errors.ip || "IP intelligence not available"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Web Fingerprint */}
        {(hasHttp || !showNotApplicable("http")) && (
          <Card className="md:col-span-2 xl:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-violet-500" />
                Web Fingerprint
              </CardTitle>
              <CardDescription>HTTP metadata & security headers</CardDescription>
            </CardHeader>
            <CardContent>
              {httpData ? (
                <div className="space-y-4">
                  {/* Status line */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={httpData.ok ? "default" : "secondary"} className="text-xs">
                        {httpData.status}
                      </Badge>
                      {httpData.redirected && (
                        <Badge variant="outline" className="text-xs">
                          Redirected
                        </Badge>
                      )}
                      {httpData.headers?.server && (
                        <Badge variant="secondary" className="text-xs">
                          {httpData.headers.server}
                        </Badge>
                      )}
                    </div>
                    <p className="break-all text-xs text-muted-foreground">{httpData.url}</p>
                  </div>

                  {/* Title */}
                  {httpData.title && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Page Title</p>
                      <p className="text-sm font-medium">{httpData.title}</p>
                    </div>
                  )}

                  {/* Regular Headers (excluding security headers) */}
                  {(() => {
                    const regularHeaders = getRegularHeaders(httpData.headers)
                    return Object.keys(regularHeaders).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Headers</p>
                        <div className="space-y-1">
                          {Object.entries(regularHeaders).map(([key, value]) => (
                            <div key={key} className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
                              <span className="text-muted-foreground">{key}:</span>{" "}
                              <span className="break-all font-mono">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Security Headers */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Security Headers
                    </div>
                    {Object.keys(httpData.securityHeaders || {}).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(httpData.securityHeaders || {}).map(([key, value]) => (
                          <div key={key} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400">{key}:</span>{" "}
                            <span className="break-all font-mono">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">No security headers detected</p>
                    )}
                  </div>
                </div>
              ) : pending.http ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {errors.http || "HTTP metadata not available"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* TLS Certificates */}
        {(hasCerts || !showNotApplicable("certs")) && (
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-cyan-500" />
                TLS Certificates
              </CardTitle>
              <CardDescription>Certificate transparency snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              {certData ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {certData.uniqueEntries} unique certs
                    </Badge>
                    {certData.latestExpiry && (
                      <Badge variant="secondary" className="text-xs">
                        Expires {new Date(certData.latestExpiry).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>

                  {/* Issuers */}
                  {certData.issuers?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issuers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {certData.issuers.map((issuer: string) => (
                          <Badge key={issuer} variant="outline" className="text-xs">
                            {issuer}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Names - no limit */}
                  {certData.names?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Observed Names ({certData.names.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {certData.names.map((name: string) => (
                          <Badge key={name} variant="secondary" className="font-mono text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : pending.certs ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-3/4" />
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {errors.certs || "Certificate data not available"}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
