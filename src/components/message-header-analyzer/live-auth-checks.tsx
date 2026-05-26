"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HapticButton as Button } from "@/components/haptic-wrappers"
import { CheckCircle2, AlertTriangle, Globe, MinusCircle, XCircle, ChevronDown, ChevronRight, GitBranch } from "lucide-react"
import type { LiveAuthLookupContext } from "@/lib/message-auth-context"
import type { CheckStatus, LiveAuthVerificationResponse, LiveCheck, SpfTreeNode } from "@/lib/message-auth-live"

interface LiveAuthChecksProps {
  context: LiveAuthLookupContext
}

function hasLookupContext(context: LiveAuthLookupContext) {
  return Boolean(context.fromDomain || context.spfDomain || context.dkimSignatures.length > 0)
}

function buildQuery(context: LiveAuthLookupContext) {
  const params = new URLSearchParams()
  if (context.fromDomain) params.set("from", context.fromDomain)
  if (context.returnPathDomain) params.set("returnPath", context.returnPathDomain)
  if (context.spfDomain) params.set("spfDomain", context.spfDomain)
  if (context.spfClientIp) params.set("ip", context.spfClientIp)
  for (const signature of context.dkimSignatures) {
    params.append("dkim", `${signature.selector}@${signature.domain}`)
  }
  return params.toString()
}

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "problem":
      return <XCircle className="h-4 w-4 text-red-500" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />
  }
}

function StatusBadge({ status }: { status: CheckStatus }) {
  switch (status) {
    case "ok":
      return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">OK</Badge>
    case "problem":
      return <Badge variant="destructive">Problem</Badge>
    case "warning":
      return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">Warning</Badge>
    default:
      return <Badge variant="secondary">Info</Badge>
  }
}

function CheckList({
  checks
}: {
  checks: LiveCheck[]
}) {
  return (
    <div className="space-y-2">
      {checks.map((check) => (
        <div key={`${check.label}-${check.message}`} className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <StatusIcon status={check.status} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{check.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{check.message}</p>
              </div>
            </div>
            <StatusBadge status={check.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

const QUALIFIER_COLORS: Record<string, string> = {
  "+": "text-emerald-500",
  "-": "text-red-500",
  "~": "text-amber-500",
  "?": "text-muted-foreground",
}

const DEPTH_STYLES: Array<{ row: string; record: string }> = [
  { row: "",                 record: "bg-muted/20" },
  { row: "bg-blue-500/5",   record: "bg-blue-500/10" },
  { row: "bg-violet-500/5", record: "bg-violet-500/10" },
  { row: "bg-amber-500/5",  record: "bg-amber-500/10" },
  { row: "bg-emerald-500/5",record: "bg-emerald-500/10" },
]

function depthStyle(depth: number) {
  return DEPTH_STYLES[depth % DEPTH_STYLES.length]
}

function SpfMechanismRow({ node, m, depth, index }: {
  node: SpfTreeNode
  m: SpfTreeNode["mechanisms"][number]
  depth: number
  index: number
}) {
  const childNode = m.type === "include"
    ? node.includes.find((n) => n.domain === m.value) ?? null
    : m.type === "redirect"
    ? node.redirect
    : null
  const isExpandable = childNode !== null
  const [open, setOpen] = useState(false)
  const indent = depth * 16
  const ds = depthStyle(depth)
  const childDs = depthStyle(depth + 1)

  return (
    <>
      <tr
        key={`${m.type}-${m.value}-${index}`}
        className={`border-t ${ds.row} ${isExpandable ? "cursor-pointer hover:brightness-95 dark:hover:brightness-110" : ""}`}
        onClick={isExpandable ? () => setOpen((v) => !v) : undefined}
      >
        <td className="w-8 px-2 py-2">
          <span className="flex h-3 w-3 items-center justify-center">
            {isExpandable && (open
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        </td>
        <td className={`py-2 font-mono font-semibold ${QUALIFIER_COLORS[m.prefix || "+"] ?? ""}`} style={{ paddingLeft: indent }}>
          {m.prefix || "+"}
          {m.prefixDescription
            ? <span className="ml-1 hidden font-normal text-muted-foreground sm:inline">({m.prefixDescription})</span>
            : null}
        </td>
        <td className="px-3 py-2 font-mono">{m.type}</td>
        <td className="px-3 py-2 font-mono break-all">{m.value || <span className="text-muted-foreground">-</span>}</td>
        <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{m.description}</td>
      </tr>
      {open && childNode && (
        <>
          <tr className={`border-t ${childDs.record}`}>
            <td colSpan={5} className="px-3 py-1.5" style={{ paddingLeft: indent + 24 }}>
              {childNode.error
                ? <Badge variant="destructive" className="text-[10px]">{childNode.error}</Badge>
                : <code className="font-mono text-xs break-all text-muted-foreground">{childNode.record}</code>}
            </td>
          </tr>
          <SpfMechanismRows node={childNode} depth={depth + 1} />
        </>
      )}
    </>
  )
}

function SpfMechanismRows({ node, depth }: { node: SpfTreeNode; depth: number }) {
  return (
    <>
      {node.mechanisms.map((m, i) => (
        <SpfMechanismRow key={`${m.type}-${m.value}-${i}`} node={node} m={m} depth={depth} index={i} />
      ))}
    </>
  )
}

function SpfTree({ node }: { node: SpfTreeNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="w-8 px-2 py-2" />
            <th className="px-3 py-2 font-medium">Qualifier</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">Description</th>
          </tr>
        </thead>
        <tbody>
          <SpfMechanismRows node={node} depth={0} />
        </tbody>
      </table>
    </div>
  )
}

export function LiveAuthChecks({ context }: LiveAuthChecksProps) {
  const [data, setData] = useState<LiveAuthVerificationResponse | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    setApproved(false)
    setData(null)
    setPending(false)
    setError(null)
  }, [context])

  useEffect(() => {
    if (!hasLookupContext(context) || !context.fromDomain || !approved) {
      return
    }

    const controller = new AbortController()

    async function run() {
      setPending(true)
      setError(null)
      try {
        const response = await fetch(`/api/message-header-auth?${buildQuery(context)}`, {
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error(`Live DNS lookup failed with status ${response.status}`)
        }
        const payload = (await response.json()) as LiveAuthVerificationResponse
        setData(payload)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Live DNS lookup failed")
      } finally {
        if (!controller.signal.aborted) setPending(false)
      }
    }

    run()

    return () => controller.abort()
  }, [approved, context])

  if (!hasLookupContext(context) || !context.fromDomain) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          Live DNS Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This check runs server-side and will query live DNS using derived values from your pasted message. Raw headers stay local unless you choose to proceed.
          </AlertDescription>
        </Alert>

        {!approved && (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Before running the live check</h3>
              <p className="text-sm text-muted-foreground">
                We will derive a small set of values from the message and send only those values to the server so it can look up current DNS records.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">From domain:</span>
                <Badge variant="outline" className="font-mono">{context.fromDomain}</Badge>
              </div>

              {context.returnPathDomain && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Return-Path / envelope domain:</span>
                  <Badge variant="outline" className="font-mono">{context.returnPathDomain}</Badge>
                </div>
              )}

              {context.spfDomain && context.spfDomain !== context.returnPathDomain && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">SPF domain:</span>
                  <Badge variant="outline" className="font-mono">{context.spfDomain}</Badge>
                </div>
              )}

              {context.spfClientIp && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Client IP from SPF context:</span>
                  <Badge variant="outline" className="font-mono">{context.spfClientIp}</Badge>
                </div>
              )}

              {context.dkimSignatures.length > 0 && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">DKIM selectors and domains:</div>
                  <div className="flex flex-wrap gap-2">
                    {context.dkimSignatures.map((signature) => (
                      <Badge
                        key={`${signature.selector}@${signature.domain}`}
                        variant="outline"
                        className="font-mono"
                      >
                        {signature.selector}@{signature.domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setApproved(true)}>
                Proceed with Live Check
              </Button>
              <p className="text-xs text-muted-foreground">
                Use this only if you are comfortable sending these derived values for live DNS verification.
              </p>
            </div>
          </div>
        )}

        {approved && pending && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {approved && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {approved && data && !pending && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono">{data.context.fromDomain}</Badge>
              {data.dnsProvider.name && (
                <span>DNS provider appears to be {data.dnsProvider.name}{data.dnsProvider.nameserver ? ` via ${data.dnsProvider.nameserver}` : ""}.</span>
              )}
              {!data.dnsProvider.name && data.dnsProvider.nameserver && (
                <span>Authoritative nameserver: {data.dnsProvider.nameserver}</span>
              )}
            </div>

            {data.dmarc && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">DMARC</h3>
                  {data.dmarc.tags.p && <Badge variant="outline">p={data.dmarc.tags.p}</Badge>}
                  {data.dmarc.tags.sp && <Badge variant="outline">sp={data.dmarc.tags.sp}</Badge>}
                  {data.dmarc.tags.adkim && <Badge variant="outline">adkim={data.dmarc.tags.adkim}</Badge>}
                  {data.dmarc.tags.aspf && <Badge variant="outline">aspf={data.dmarc.tags.aspf}</Badge>}
                </div>
                {data.dmarc.record && (
                  <div className="rounded-md bg-muted/50 p-2">
                    <code className="font-mono text-xs break-all">{data.dmarc.record}</code>
                  </div>
                )}
                <CheckList checks={data.dmarc.checks} />
              </section>
            )}

            {data.spf && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">SPF</h3>
                  <Badge variant="outline" className="font-mono">{data.spf.domain}</Badge>
                  {data.spf.clientIp && <Badge variant="outline" className="font-mono">{data.spf.clientIp}</Badge>}
                  {data.spf.evaluation && <Badge variant="secondary">{data.spf.evaluation.result.toUpperCase()}</Badge>}
                </div>
                {data.spf.tree && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5" />
                      Mechanisms
                    </div>
                    {data.spf.record && (
                      <div className="rounded-md bg-muted/50 p-2">
                        <code className="font-mono text-xs break-all">{data.spf.record}</code>
                      </div>
                    )}
                    <SpfTree node={data.spf.tree} />
                  </div>
                )}
                <CheckList checks={data.spf.checks} />
              </section>
            )}

            {data.dkim.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">DKIM</h3>
                {data.dkim.map((entry) => (
                  <div key={`${entry.selector}@${entry.domain}`} className="space-y-3 rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">{entry.selector}</Badge>
                      <Badge variant="outline" className="font-mono">{entry.domain}</Badge>
                      {entry.tags.v && <Badge variant="secondary">{entry.tags.v}</Badge>}
                      {entry.tags.k && <Badge variant="secondary">k={entry.tags.k}</Badge>}
                    </div>
                    {entry.record && (
                      <div className="rounded-md bg-muted/50 p-2">
                        <code className="font-mono text-xs break-all">{entry.record}</code>
                      </div>
                    )}
                    <CheckList checks={entry.checks} />
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
