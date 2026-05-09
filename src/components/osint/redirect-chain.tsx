"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowDown } from "lucide-react"
import type { RedirectHop } from "@/lib/osint-types"

interface RedirectChainProps {
  chain: RedirectHop[]
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return "bg-emerald-950 text-emerald-400 border-emerald-800"
  if (status >= 300 && status < 400) return "bg-amber-950 text-amber-400 border-amber-900"
  return "bg-red-950 text-red-400 border-red-900"
}

export function RedirectChain({ chain }: RedirectChainProps) {
  if (chain.length === 0) return <div className="text-sm text-muted-foreground">No redirect data</div>

  const totalMs = chain.reduce((sum, hop) => sum + hop.latencyMs, 0)
  const finalHop = chain[chain.length - 1]
  const isHTTPS = finalHop?.url?.startsWith("https://")
  const hasOpenRedirect = chain.some((hop, i) => {
    if (i === 0) return false
    try {
      return new URL(hop.url).hostname !== new URL(chain[0].url).hostname
    } catch { return false }
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge className={`text-xs ${chain.length === 1 ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-amber-950 text-amber-400 border-amber-900"}`}>
          {chain.length} {chain.length === 1 ? "hop" : "hops"}
        </Badge>
        <Badge variant="outline" className="text-xs">{totalMs}ms total</Badge>
        {isHTTPS && <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">HTTPS enforced</Badge>}
        {hasOpenRedirect && (
          <Badge className="bg-red-950 text-red-400 border-red-900 text-xs">Open redirect detected</Badge>
        )}
      </div>
      <div className="space-y-1">
        {chain.map((hop, i) => (
          <div key={i}>
            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
              <Badge className={`shrink-0 font-mono text-xs ${statusColor(hop.status)}`}>{hop.status}</Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{hop.url}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{hop.latencyMs}ms</span>
            </div>
            {i < chain.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3 w-3 text-border" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
