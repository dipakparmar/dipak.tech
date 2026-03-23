"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HapticButton as Button } from "@/components/haptic-wrappers"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Globe,
  MapPin,
  Network,
  Shield,
  Clock,
  Server,
  Copy,
  Check,
  Loader2,
  Search,
  Info,
  ChevronRight,
  Router,
  Waypoints,
} from "lucide-react"
import { IPResponse } from "@/types/ip"
import { Map, MapMarker, MapTileLayer, MapPopup } from "@/components/ui/map"
import { siteConfig } from "@/lib/og-config"
import { parseNetworkInput } from "@/lib/network-input-parser"
import type { ParsedInput, NetworkIntelResponse, BGPRoutingInfo, ASNDetail } from "@/types/network"

const BLUR_FADE_DELAY = 0.04

// --- Sub-components ---

function ASNSummaryCard({ detail }: { detail: ASNDetail }) {
  return (
    <Card className="mb-6 border-purple-500/50 bg-linear-to-br from-purple-50 to-transparent dark:from-purple-950/20">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <Label className="text-xs text-muted-foreground">Autonomous System</Label>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-3xl font-bold tracking-tight">AS{detail.asn}</p>
              <Badge variant="outline" className="text-xs">
                {detail.rir}
              </Badge>
              {detail.country && (
                <Badge variant="secondary" className="text-xs">
                  {detail.country}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{detail.name}</p>
            {detail.description && detail.description !== detail.name && (
              <p className="text-xs text-muted-foreground">{detail.description}</p>
            )}
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{detail.prefixes_v4.length}</p>
              <p className="text-xs text-muted-foreground">IPv4 Prefixes</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{detail.prefixes_v6.length}</p>
              <p className="text-xs text-muted-foreground">IPv6 Prefixes</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{detail.peers_count}</p>
              <p className="text-xs text-muted-foreground">Peers</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ASNPrefixesCard({ detail }: { detail: ASNDetail }) {
  const [showAllV4, setShowAllV4] = useState(false)
  const [showAllV6, setShowAllV6] = useState(false)
  const limit = 20

  const v4Display = showAllV4 ? detail.prefixes_v4 : detail.prefixes_v4.slice(0, limit)
  const v6Display = showAllV6 ? detail.prefixes_v6 : detail.prefixes_v6.slice(0, limit)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Network className="h-5 w-5 text-green-500" />
          Announced Prefixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IPv4 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            IPv4 Prefixes ({detail.prefixes_v4.length})
          </h3>
          {detail.prefixes_v4.length === 0 ? (
            <p className="text-sm text-muted-foreground">No IPv4 prefixes announced</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {v4Display.map((p) => (
                  <span
                    key={p.prefix}
                    className="rounded bg-muted px-2 py-1 font-mono text-xs"
                    title={p.name}
                  >
                    {p.prefix}
                  </span>
                ))}
              </div>
              {detail.prefixes_v4.length > limit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAllV4(!showAllV4)}
                >
                  {showAllV4
                    ? "Show less"
                    : `Show all ${detail.prefixes_v4.length} prefixes`}
                </Button>
              )}
            </>
          )}
        </div>

        {/* IPv6 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            IPv6 Prefixes ({detail.prefixes_v6.length})
          </h3>
          {detail.prefixes_v6.length === 0 ? (
            <p className="text-sm text-muted-foreground">No IPv6 prefixes announced</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {v6Display.map((p) => (
                  <span
                    key={p.prefix}
                    className="rounded bg-muted px-2 py-1 font-mono text-xs"
                    title={p.name}
                  >
                    {p.prefix}
                  </span>
                ))}
              </div>
              {detail.prefixes_v6.length > limit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAllV6(!showAllV6)}
                >
                  {showAllV6
                    ? "Show less"
                    : `Show all ${detail.prefixes_v6.length} prefixes`}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ASNPeersCard({ detail }: { detail: ASNDetail }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Waypoints className="h-5 w-5 text-blue-500" />
          Upstreams &amp; Downstreams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Upstreams */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Upstreams ({detail.upstreams.length})
            </h3>
            {detail.upstreams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upstream peers</p>
            ) : (
              <div className="space-y-1">
                {detail.upstreams.map((peer, i) => (
                  <div key={`${peer.asn}-${i}`} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-mono text-xs">
                      AS{peer.asn}
                    </Badge>
                    <span className="truncate text-muted-foreground">{peer.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Downstreams */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Downstreams ({detail.downstreams.length})
            </h3>
            {detail.downstreams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No downstream peers</p>
            ) : (
              <div className="space-y-1">
                {detail.downstreams.map((peer, i) => (
                  <div key={`${peer.asn}-${i}`} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-mono text-xs">
                      AS{peer.asn}
                    </Badge>
                    <span className="truncate text-muted-foreground">{peer.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- AS Path Graph (SVG DAG) ---

type GraphNode = { id: string; col: number; row: number }
type GraphEdge = { from: string; to: string; pathCount: number }

function buildASPathGraph(paths: string[][], originAsn: string) {
  // Build a DAG from multiple AS paths
  // Each path goes left-to-right: source → ... → origin
  const nodes: Record<string, { cols: number[]; rows: number[] }> = {}
  const edgeCounts: Record<string, number> = {}

  for (let pi = 0; pi < paths.length; pi++) {
    const path = paths[pi]
    for (let i = 0; i < path.length; i++) {
      const asn = path[i]
      if (!nodes[asn]) {
        nodes[asn] = { cols: [], rows: [] }
      }
      if (!nodes[asn].cols.includes(i)) nodes[asn].cols.push(i)
      if (!nodes[asn].rows.includes(pi)) nodes[asn].rows.push(pi)

      if (i < path.length - 1) {
        const key = `${asn}->${path[i + 1]}`
        edgeCounts[key] = (edgeCounts[key] || 0) + 1
      }
    }
  }

  // Position nodes: column = most common position, row = average row
  const positioned: GraphNode[] = []
  const nodePositions: Record<string, { x: number; y: number }> = {}

  for (const [id, info] of Object.entries(nodes)) {
    const col = Math.round(info.cols.reduce((a, b) => a + b, 0) / info.cols.length)
    const row = info.rows.reduce((a, b) => a + b, 0) / info.rows.length
    positioned.push({ id, col, row })
  }

  // Sort by column for layout
  positioned.sort((a, b) => a.col - b.col || a.row - b.row)

  // Assign final positions - group by column
  const colGroups: Record<number, GraphNode[]> = {}
  for (const node of positioned) {
    if (!colGroups[node.col]) colGroups[node.col] = []
    colGroups[node.col].push(node)
  }

  const nodeW = 72
  const nodeH = 28
  const colGap = 40
  const rowGap = 16

  let colIndex = 0
  for (const col of Object.keys(colGroups).map(Number).sort((a, b) => a - b)) {
    const group = colGroups[col]
    group.sort((a, b) => a.row - b.row)
    for (let ri = 0; ri < group.length; ri++) {
      const x = colIndex * (nodeW + colGap)
      const y = ri * (nodeH + rowGap)
      nodePositions[group[ri].id] = { x, y }
    }
    colIndex++
  }

  const graphEdges: (GraphEdge & { fromPos: { x: number; y: number }; toPos: { x: number; y: number } })[] = []
  for (const [key, count] of Object.entries(edgeCounts)) {
    const [from, to] = key.split("->")
    const fromPos = nodePositions[from]
    const toPos = nodePositions[to]
    if (fromPos && toPos) {
      graphEdges.push({ from, to, pathCount: count, fromPos, toPos })
    }
  }

  const allPositions = Object.values(nodePositions)
  const width = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.x)) + nodeW + 8 : 200
  const height = allPositions.length > 0 ? Math.max(...allPositions.map((p) => p.y)) + nodeH + 8 : 60

  return { nodePositions, graphEdges, width, height, originAsn, nodeW, nodeH }
}

function ASPathGraph({ paths, originAsn }: { paths: string[][]; originAsn: string }) {
  const graph = useMemo(() => buildASPathGraph(paths, originAsn), [paths, originAsn])
  const { nodePositions, graphEdges, width, height, nodeW, nodeH } = graph

  const nodeEntries = Object.entries(nodePositions)
  if (nodeEntries.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-md border bg-muted/20 p-3">
      <svg
        width={width}
        height={height}
        viewBox={`-4 -4 ${width + 8} ${height + 8}`}
        className="min-w-full"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              className="fill-muted-foreground/50"
            />
          </marker>
        </defs>

        {/* Edges */}
        {graphEdges.map((edge, i) => {
          const x1 = edge.fromPos.x + nodeW
          const y1 = edge.fromPos.y + nodeH / 2
          const x2 = edge.toPos.x
          const y2 = edge.toPos.y + nodeH / 2
          const midX = (x1 + x2) / 2
          const strokeWidth = Math.min(1 + edge.pathCount, 4)
          const opacity = 0.3 + Math.min(edge.pathCount * 0.15, 0.5)

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              className="stroke-muted-foreground"
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              markerEnd="url(#arrowhead)"
            />
          )
        })}

        {/* Nodes */}
        {nodeEntries.map(([asn, pos]) => {
          const isOrigin = asn === originAsn
          return (
            <g key={asn} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={nodeW}
                height={nodeH}
                rx={6}
                className={
                  isOrigin
                    ? "fill-green-500/20 stroke-green-500"
                    : "fill-background stroke-border"
                }
                strokeWidth={isOrigin ? 2 : 1}
              />
              <text
                x={nodeW / 2}
                y={nodeH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-mono text-[10px] ${isOrigin ? "fill-green-600 font-bold dark:fill-green-400" : "fill-foreground"}`}
              >
                AS{asn}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded border-2 border-green-500 bg-green-500/20" />
          Origin
        </span>
        <span>Thicker lines = more routes through that link</span>
      </div>
    </div>
  )
}

function BGPRoutingContent({ bgp }: { bgp: BGPRoutingInfo }) {
  const rpkiColor =
    bgp.rpki_status === "valid"
      ? "bg-green-500"
      : bgp.rpki_status === "invalid"
        ? "bg-red-500"
        : "bg-gray-400"

  const displayPaths = bgp.as_path?.slice(0, 5) ?? []

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Prefix</Label>
          <p className="mt-1 font-mono text-sm font-medium">{bgp.prefix}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Origin ASN</Label>
          <p className="mt-1 font-mono text-sm font-medium">
            AS{bgp.origin_asn}{" "}
            <span className="font-sans text-muted-foreground">({bgp.origin_asname})</span>
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">RPKI Status</Label>
          <div className="mt-1">
            <Badge className={`${rpkiColor} text-white`}>
              {bgp.rpki_status ?? "not-found"}
            </Badge>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Visibility</Label>
          <p className="mt-1 text-sm font-medium">{bgp.visibility}%</p>
        </div>
      </div>

      {/* AS Path Graph */}
      {displayPaths.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">
            AS Paths ({bgp.as_path?.length ?? 0} observed)
          </Label>
          <div className="mt-2">
            <ASPathGraph paths={displayPaths} originAsn={bgp.origin_asn} />
          </div>
        </div>
      )}
    </div>
  )
}

function BGPRoutingCard({ bgp }: { bgp: BGPRoutingInfo }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Router className="h-5 w-5 text-orange-500" />
          BGP Routing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BGPRoutingContent bgp={bgp} />
      </CardContent>
    </Card>
  )
}

function NetworkIntelSections({
  ip,
  isCidr,
}: {
  ip: string
  isCidr: boolean
}) {
  const [networkData, setNetworkData] = useState<NetworkIntelResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)
  const [openSections, setOpenSections] = useState<string[]>(
    isCidr ? ["network-block"] : []
  )

  const fetchData = async () => {
    if (hasFetched.current) return
    hasFetched.current = true
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ip/network?query=${encodeURIComponent(ip)}`)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data: NetworkIntelResponse = await res.json()
      setNetworkData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch for CIDR input
  useEffect(() => {
    if (isCidr) {
      fetchData()
    }
  }, [isCidr])

  const handleValueChange = (value: string[]) => {
    setOpenSections(value)
    // Lazy-load on first expand of any section
    if (value.length > 0 && !hasFetched.current) {
      fetchData()
    }
  }

  return (
    <BlurFade delay={BLUR_FADE_DELAY * 7}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-purple-500" />
            Network Intelligence
          </CardTitle>
          <CardDescription>
            Expand sections to view network block, BGP routing, and peer details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={handleValueChange}
          >
            {/* Network Block Info */}
            <AccordionItem value="network-block">
              <AccordionTrigger>Network Block Info</AccordionTrigger>
              <AccordionContent className="h-auto">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : networkData?.rdap ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Network Name</Label>
                      <p className="mt-1 text-sm font-medium">{networkData.rdap.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Handle</Label>
                      <p className="mt-1 font-mono text-sm">{networkData.rdap.handle}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CIDR</Label>
                      <p className="mt-1 font-mono text-sm">{networkData.rdap.cidr}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Range</Label>
                      <p className="mt-1 font-mono text-sm">
                        {networkData.rdap.startAddress} - {networkData.rdap.endAddress}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Registrant</Label>
                      <p className="mt-1 text-sm">{networkData.rdap.registrant}</p>
                    </div>
                    {networkData.rdap.abuseContact && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Abuse Contact</Label>
                        <p className="mt-1 text-sm">{networkData.rdap.abuseContact}</p>
                      </div>
                    )}
                    {networkData.rdap.registrationDate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Registration Date</Label>
                        <p className="mt-1 text-sm">{networkData.rdap.registrationDate}</p>
                      </div>
                    )}
                    {networkData.rdap.status.length > 0 && (
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {networkData.rdap.status.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* BGP Routing */}
            <AccordionItem value="bgp-routing">
              <AccordionTrigger>BGP Routing</AccordionTrigger>
              <AccordionContent className="h-auto">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : networkData?.bgp ? (
                  <BGPRoutingContent bgp={networkData.bgp} />
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* BGP Peers */}
            <AccordionItem value="bgp-peers">
              <AccordionTrigger>BGP Peers</AccordionTrigger>
              <AccordionContent className="h-auto">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : networkData?.bgp?.peers && networkData.bgp.peers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ASN</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {networkData.bgp.peers.map((peer) => (
                        <TableRow key={`${peer.asn}-${peer.type}`}>
                          <TableCell className="font-mono text-xs">AS{peer.asn}</TableCell>
                          <TableCell className="text-sm">{peer.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {peer.type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Nameservers */}
            <AccordionItem value="nameservers">
              <AccordionTrigger>Nameservers</AccordionTrigger>
              <AccordionContent className="h-auto">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : networkData?.nameservers && networkData.nameservers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {networkData.nameservers.map((ns) => (
                      <span
                        key={ns}
                        className="rounded bg-muted px-2 py-1 font-mono text-xs"
                      >
                        {ns}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </BlurFade>
  )
}

// --- Main Component ---

export default function IPInfoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ipData, setIpData] = useState<IPResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customIp, setCustomIp] = useState("")
  const [copied, setCopied] = useState(false)
  const [isCustomLookup, setIsCustomLookup] = useState(false)
  const [showSearch, setShowSearch] = useState(true)
  const [baseUrl, setBaseUrl] = useState("")
  const [parsedInput, setParsedInput] = useState<ParsedInput | null>(null)
  const [networkData, setNetworkData] = useState<NetworkIntelResponse | null>(null)
  const [networkLoading, setNetworkLoading] = useState(false)

  useEffect(() => {
    try {
      // Set base URL for API examples based on current host
      const host = window.location.host
      if (host.includes(siteConfig.ip.domain)) {
        setBaseUrl(siteConfig.ip.baseUrl)
      } else if (host.includes(siteConfig.tools.domain)) {
        setBaseUrl(siteConfig.tools.baseUrl)
      } else {
        // Development or other environment
        setBaseUrl(window.location.origin)
      }

      // Check URL params for IP (support both 'target' and 'ip' params)
      const urlIp = searchParams.get("target") || searchParams.get("ip")

      if (urlIp) {
        // Validate and sanitize the IP parameter
        const trimmedIp = urlIp.trim()
        if (trimmedIp.length > 0 && trimmedIp.length < 256) {
          setCustomIp(trimmedIp)
          const parsed = parseNetworkInput(trimmedIp)
          setParsedInput(parsed)
          if (parsed.type === "asn") {
            fetchNetworkIntel(parsed.value)
          } else {
            fetchIPInfo(parsed.value)
          }
        } else {
          console.warn(`Invalid IP parameter length: ${trimmedIp.length}`)
          setError("Invalid IP address parameter")
          fetchIPInfo() // Fall back to auto-detect
        }
      } else {
        // Load user's IP on mount
        fetchIPInfo()
      }
    } catch (error) {
      console.error("Error initializing IP info component:", error)
      setError("Failed to initialize IP lookup")
      // Still try to fetch user's IP as fallback
      fetchIPInfo()
    }
  }, [searchParams])

  const fetchIPInfo = async (ip?: string) => {
    setLoading(true)
    setError(null)
    setNetworkData(null)
    setIsCustomLookup(!!ip)

    try {
      const params = new URLSearchParams({ details: "true" })
      if (ip) {
        params.set("ip", ip)
      }

      const response = await fetch(`/api/ip?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch IP info: ${response.status}`)
      }

      const data: IPResponse = await response.json()

      if (data.status === "fail") {
        throw new Error(data.message || "Failed to fetch IP information")
      }

      setIpData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchNetworkIntel = async (query: string) => {
    setNetworkLoading(true)
    setError(null)
    setIpData(null)
    setIsCustomLookup(true)

    try {
      const res = await fetch(`/api/ip/network?query=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`Failed to fetch network intel: ${res.status}`)
      const data: NetworkIntelResponse = await res.json()
      setNetworkData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setNetworkLoading(false)
    }
  }

  const handleCustomLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (customIp.trim()) {
      const parsed = parseNetworkInput(customIp.trim())
      setParsedInput(parsed)

      try {
        await router.push(`/tools/ip?ip=${encodeURIComponent(customIp.trim())}`)
      } catch (error) {
        console.error("Failed to update URL during lookup:", error)
      }

      if (parsed.type === "asn") {
        fetchNetworkIntel(parsed.value)
      } else {
        fetchIPInfo(parsed.value)
      }
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)

      // Fallback to legacy method
      try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)

        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        console.error("Fallback copy method also failed:", fallbackError)
        setError("Failed to copy to clipboard. Please copy manually.")
        setTimeout(() => setError(null), 3000)
      }
    }
  }

  const isASNView = parsedInput?.type === "asn"
  const isCidrView = parsedInput?.type === "cidr"

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <BlurFade delay={BLUR_FADE_DELAY}>
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            <h1 className="text-3xl font-bold">IP &amp; Network Intelligence</h1>
          </div>
          <p className="text-muted-foreground">
            Look up IP addresses, ASNs, BGP prefixes, and network block details
          </p>
        </div>
      </BlurFade>

      {/* Custom IP / Network Lookup — always visible */}
      <BlurFade delay={BLUR_FADE_DELAY * 2}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Network Lookup
            </CardTitle>
            <CardDescription>
              Enter an IP address, domain, ASN, BGP prefix, or paste a URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomLookup} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter IP, domain, ASN (e.g. AS13335), BGP prefix (1.1.1.0/24), or URL..."
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  disabled={loading || networkLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || networkLoading || !customIp.trim()}
              >
                {loading || networkLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Lookup
                  </>
                )}
              </Button>
            </form>
            {/* Parser extraction badge */}
            {parsedInput && parsedInput.confidence === "extracted" && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {parsedInput.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Extracted <span className="font-mono font-medium">{parsedInput.value}</span> from
                  your input
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </BlurFade>

      {/* Error State */}
      {error && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <Info className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Loading State */}
      {(loading || networkLoading) && !ipData && !networkData && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* ASN Results View */}
      {isASNView && networkData && !networkLoading && (
        <>
          {/* ASN Summary */}
          {networkData.asn_detail && (
            <>
              <BlurFade delay={BLUR_FADE_DELAY * 3}>
                <ASNSummaryCard detail={networkData.asn_detail} />
              </BlurFade>

              <BlurFade delay={BLUR_FADE_DELAY * 4}>
                <ASNPrefixesCard detail={networkData.asn_detail} />
              </BlurFade>

              <BlurFade delay={BLUR_FADE_DELAY * 5}>
                <ASNPeersCard detail={networkData.asn_detail} />
              </BlurFade>
            </>
          )}

          {/* BGP Routing for ASN */}
          {networkData.bgp && (
            <BlurFade delay={BLUR_FADE_DELAY * 6}>
              <BGPRoutingCard bgp={networkData.bgp} />
            </BlurFade>
          )}
        </>
      )}

      {/* IP Information Display */}
      {ipData && !loading && !isASNView && (
        <>
          {/* Main IP Card */}
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Card className="mb-6 border-blue-500/50 bg-linear-to-br from-blue-50 to-transparent dark:from-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="text-center sm:text-left">
                    <Label className="text-xs text-muted-foreground">
                      {isCustomLookup ? "IP Address" : "Your IP Address"}
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-3xl font-bold tracking-tight">{ipData.ip}</p>
                      <Badge variant="outline" className="text-xs">
                        {ipData.ip_type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(ipData.ip || "")}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Location Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <p className="mt-1 font-medium">
                      {ipData.country} ({ipData.countryCode})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <p className="mt-1 font-medium">{ipData.regionName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="mt-1 font-medium">{ipData.city || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                    <p className="mt-1 font-medium">{ipData.zip || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Coordinates</Label>
                    <p className="mt-1 font-mono text-sm">
                      {ipData.lat?.toFixed(4)}, {ipData.lon?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    <p className="mt-1 font-medium">{ipData.timezone}</p>
                  </div>
                </div>

                {/* Map */}
                {ipData.lat && ipData.lon && (
                  <div className="h-100 w-full overflow-hidden rounded-md border">
                    <Map center={[ipData.lat, ipData.lon]} zoom={10} className="rounded-md">
                      <MapTileLayer />
                      <MapMarker
                        position={[ipData.lat, ipData.lon]}
                        icon={
                          <div className="relative flex items-center justify-center">
                            {/* Pulse animation */}
                            <div className="absolute h-8 w-8 animate-ping rounded-full bg-blue-500 opacity-75" />
                            {/* Outer ring */}
                            <div className="absolute h-8 w-8 rounded-full bg-blue-500/30" />
                            {/* Inner marker */}
                            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                              <MapPin className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        }
                        iconAnchor={[16, 16]}
                      >
                        <MapPopup>
                          <div className="min-w-48 space-y-3">
                            {/* IP Address */}
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Network className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">IP Address</p>
                                <p className="font-mono font-semibold">{ipData.ip}</p>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">Location</p>
                                  <p className="text-sm font-medium">
                                    {ipData.city}, {ipData.regionName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {ipData.country} ({ipData.countryCode})
                                  </p>
                                </div>
                              </div>

                              {/* ISP */}
                              {ipData.isp && (
                                <div className="flex items-start gap-2">
                                  <Globe className="mt-0.5 h-3.5 w-3.5 text-green-500" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">ISP</p>
                                    <p className="text-sm font-medium">{ipData.isp}</p>
                                  </div>
                                </div>
                              )}

                              {/* Coordinates */}
                              <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                                <p className="font-mono text-xs text-muted-foreground">
                                  {ipData.lat?.toFixed(4)}, {ipData.lon?.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </MapPopup>
                      </MapMarker>
                    </Map>
                  </div>
                )}
              </CardContent>
            </Card>
          </BlurFade>

          {/* Network Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Network className="h-5 w-5 text-green-500" />
                  Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ISP</Label>
                    <p className="mt-1 font-medium">{ipData.isp}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Organization</Label>
                    <p className="mt-1 font-medium">{ipData.org}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AS Number</Label>
                    <p className="mt-1 font-mono text-sm">{ipData.as}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AS Name</Label>
                    <p className="mt-1 font-medium">{ipData.asname}</p>
                  </div>
                  {ipData.reverse && (
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Reverse DNS</Label>
                      <p className="mt-1 font-mono text-sm">{ipData.reverse}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Security Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-yellow-500" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={ipData.mobile ? "default" : "secondary"}>
                      {ipData.mobile ? "Mobile" : "Not Mobile"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ipData.proxy ? "destructive" : "secondary"}
                      className={ipData.proxy ? "bg-orange-500" : ""}
                    >
                      {ipData.proxy ? "Proxy Detected" : "No Proxy"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ipData.hosting ? "default" : "secondary"}>
                      {ipData.hosting ? "Hosting/VPN" : "Not Hosting"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Network Intelligence Accordion — after Security, before API Usage */}
          {ipData.ip && (
            <NetworkIntelSections ip={ipData.ip} isCidr={!!isCidrView} />
          )}
        </>
      )}

      {/* API Usage */}
      <BlurFade delay={BLUR_FADE_DELAY * 8}>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" />
              API Usage
            </CardTitle>
            <CardDescription>Access IP information programmatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Get your IP (simple)</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl ? `curl ${baseUrl}/api/ip` : "curl /api/ip"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Get detailed info</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl ? `curl ${baseUrl}/api/ip?details=true` : "curl /api/ip?details=true"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lookup specific IP or domain</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl
                  ? `curl ${baseUrl}/api/ip?target=8.8.8.8&details=true`
                  : "curl /api/ip?target=8.8.8.8&details=true"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Resolve domain to IP</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl
                  ? `curl ${baseUrl}/api/ip?target=google.com&details=true`
                  : "curl /api/ip?target=google.com&details=true"}
              </code>
            </div>
            {ipData?.req_left !== undefined && (
              <div className="mt-6 flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Rate Limit: {ipData.req_left} requests remaining, resets in {ipData.resets_in}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  )
}
