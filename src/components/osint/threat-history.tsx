"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Server, Archive, FileSearch } from "lucide-react"
import type { ThreatData } from "@/lib/osint-types"

interface ThreatHistoryProps {
  threatData: ThreatData | null
  pending: boolean
  error?: string
}

export function ThreatHistory({ threatData, pending, error }: ThreatHistoryProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
        Threat & History unavailable: {error}
      </div>
    )
  }

  if (pending || !threatData) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Shodan */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Ports</span>
          <span className="ml-auto text-xs text-muted-foreground">Shodan</span>
        </div>
        {threatData.shodan.length > 0 ? (
          <div className="space-y-3">
            {threatData.shodan.map((host) => (
              <div key={host.ip}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs text-foreground">{host.ip}</span>
                  {host.vulns.length > 0 ? (
                    <Badge className="bg-red-950 text-red-400 border-red-900 text-xs">
                      {host.vulns.length} CVE{host.vulns.length > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">0 CVEs</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {host.ports.slice(0, 8).map((port) => (
                    <span key={port} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground border border-border/60">
                      {port}
                    </span>
                  ))}
                  {host.ports.length > 8 && (
                    <span className="text-xs text-muted-foreground">+{host.ports.length - 8}</span>
                  )}
                </div>
                {host.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {host.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No Shodan data available</div>
        )}
      </div>

      {/* Wayback Machine */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Archive</span>
        </div>
        {threatData.wayback.available ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="text-lg font-bold">{threatData.wayback.firstSeen ?? "—"}</div>
                <div className="text-xs text-muted-foreground">First seen</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="text-lg font-bold text-emerald-400">
                  {threatData.wayback.approximateCount != null
                    ? `${threatData.wayback.approximateCount.toLocaleString()}+`
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Snapshots</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last archived</span>
              <span>{threatData.wayback.lastArchived ?? "Unknown"}</span>
            </div>
            {threatData.wayback.latestUrl && (
              <a
                href={threatData.wayback.latestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                View latest snapshot ↗
              </a>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No archives found</div>
        )}
      </div>

      {/* Crawl Rules */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crawl Rules</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">robots.txt</span>
            {threatData.crawl.robots.found ? (
              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">Found</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">Not found</Badge>
            )}
          </div>
          {threatData.crawl.robots.found && (
            <div className="space-y-1 pl-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Disallow rules</span>
                <span>{threatData.crawl.robots.disallowCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">User-agents</span>
                <span>{threatData.crawl.robots.userAgentCount}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <span className="text-xs text-muted-foreground">sitemap.xml</span>
            {threatData.crawl.sitemap.found ? (
              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">Found</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">Not found</Badge>
            )}
          </div>
          {threatData.crawl.sitemap.found && (
            <div className="space-y-1 pl-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">URLs listed</span>
                <span>{threatData.crawl.sitemap.urlCount.toLocaleString()}</span>
              </div>
              {threatData.crawl.sitemap.lastModified && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last modified</span>
                  <span>{threatData.crawl.sitemap.lastModified}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
