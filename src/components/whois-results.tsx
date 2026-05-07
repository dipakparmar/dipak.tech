"use client"

import {
  Building,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Globe,
  Hash,
  Info,
  LinkIcon,
  Lock,
  Mail,
  MapPin,
  Network,
  Phone,
  Server,
  Shield,
  User,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HapticTabsTrigger as TabsTrigger } from "@/components/haptic-wrappers"
import { useCallback, useState } from "react"
import { useHaptics } from "@/hooks/use-haptics"

import { Badge } from "@/components/ui/badge"
import { HapticButton as Button } from "@/components/haptic-wrappers"

interface WhoisResultsProps {
  data: any
  query: string
}

type QueryType = "domain" | "ipv4" | "ipv6" | "asn"

type EppStatusInfo = {
  label: string
  summary: string
  action: string
}

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "clientLock"
  | "serverLock"
  | "period"
  | "inactive"
  | "neutral"

const EPP_STATUS_INFO: Record<string, EppStatusInfo> = {
  addperiod: {
    label: "Add Period",
    summary: "Grace period right after initial registration.",
    action: "No action needed unless you intended to cancel the new registration.",
  },
  autorenewperiod: {
    label: "Auto Renew Period",
    summary: "Registry auto-renewed the domain after expiry for a limited grace period.",
    action: "Contact your registrar quickly if you do not want to keep or pay for the renewal.",
  },
  inactive: {
    label: "Inactive",
    summary: "The domain has no active delegation data and will not resolve in DNS.",
    action: "Check nameserver setup or registrar verification requirements if this persists.",
  },
  ok: {
    label: "OK",
    summary: "Normal active status with no pending operations or restrictions.",
    action: "Consider transfer, update, and delete protection if you want stronger anti-hijack safeguards.",
  },
  pendingcreate: {
    label: "Pending Create",
    summary: "A create request exists and the registry is still processing it.",
    action: "Monitor the registration or contact the registrar if you did not initiate it.",
  },
  pendingdelete: {
    label: "Pending Delete",
    summary: "The domain is near final deletion and will soon drop from the registry.",
    action: "Contact your registrar immediately if you want to keep the domain.",
  },
  pendingrenew: {
    label: "Pending Renew",
    summary: "A renewal request has been submitted and is still processing.",
    action: "Contact your registrar if you did not authorize the renewal.",
  },
  pendingrestore: {
    label: "Pending Restore",
    summary: "The registrar requested restoration and the registry is waiting on documentation or completion.",
    action: "Watch closely and contact the registrar if the domain falls back to redemption period.",
  },
  pendingtransfer: {
    label: "Pending Transfer",
    summary: "A registrar transfer request is in progress.",
    action: "Contact your registrar immediately if you did not request the transfer.",
  },
  pendingupdate: {
    label: "Pending Update",
    summary: "A domain update request is being processed.",
    action: "Contact your registrar if you did not request the update.",
  },
  redemptionperiod: {
    label: "Redemption Period",
    summary: "The domain was deleted by the registrar and is in the restore window before permanent removal.",
    action: "Contact your registrar immediately if you want to restore the domain.",
  },
  renewperiod: {
    label: "Renew Period",
    summary: "Short grace period after an explicit registrar-driven renewal.",
    action: "Contact your registrar if the renewal was not expected.",
  },
  serverdeleteprohibited: {
    label: "Server Delete Prohibited",
    summary: "Registry-level lock prevents deletion, often due to dispute, policy, or enhanced lock service.",
    action: "Contact your registrar if you need the reason or want the lock removed.",
  },
  serverhold: {
    label: "Server Hold",
    summary: "Registry disabled DNS activation, so the domain will not resolve.",
    action: "Contact your registrar because this usually indicates a registry-side issue or restriction.",
  },
  serverrenewprohibited: {
    label: "Server Renew Prohibited",
    summary: "Registry is blocking renewal of the domain.",
    action: "Contact your registrar promptly to understand and resolve the restriction.",
  },
  servertransferprohibited: {
    label: "Server Transfer Prohibited",
    summary: "Registry-level lock prevents transfer to another registrar.",
    action: "Contact your registrar if you need the transfer unlocked or explained.",
  },
  serverupdateprohibited: {
    label: "Server Update Prohibited",
    summary: "Registry-level lock prevents updates to domain data.",
    action: "Contact your registrar if you need changes made or need the restriction explained.",
  },
  transferperiod: {
    label: "Transfer Period",
    summary: "Grace period after a successful registrar transfer.",
    action: "Contact your previous or current registrar if the transfer was not expected.",
  },
  clientdeleteprohibited: {
    label: "Client Delete Prohibited",
    summary: "Registrar lock preventing deletion of the domain.",
    action: "Ask your registrar to remove the lock if you intentionally want to delete the domain.",
  },
  clienthold: {
    label: "Client Hold",
    summary: "Registrar disabled DNS activation, so the domain will not resolve.",
    action: "Contact your registrar because this often indicates billing, policy, or compliance issues.",
  },
  clientrenewprohibited: {
    label: "Client Renew Prohibited",
    summary: "Registrar is blocking renewal of the domain.",
    action: "Contact your registrar if you want to renew or need the restriction removed.",
  },
  clienttransferprohibited: {
    label: "Client Transfer Prohibited",
    summary: "Registrar lock preventing transfer to another registrar.",
    action: "This is usually protective. Ask your registrar to remove it only if you intend to transfer the domain.",
  },
  clientupdateprohibited: {
    label: "Client Update Prohibited",
    summary: "Registrar lock preventing updates to the domain.",
    action: "Contact your registrar if you need to change nameservers or registrant settings.",
  },
}

function normalizeStatusKey(status: string): string {
  return status.toLowerCase().replace(/[\s_-]+/g, "")
}

function getStatusTone(status: string): StatusTone {
  const key = normalizeStatusKey(status)

  if (key === "ok" || key === "active") return "success"
  if (key === "inactive") return "inactive"
  if (key.includes("hold")) return "danger"
  if (key === "redemptionperiod" || key === "pendingdelete") return "danger"
  if (key.startsWith("pending")) return "warning"
  if (key.startsWith("client") && key.endsWith("prohibited")) return "clientLock"
  if (key.startsWith("server") && key.endsWith("prohibited")) return "serverLock"
  if (key.endsWith("period")) return "period"

  return "neutral"
}

function getStatusBadgeClassName(status: string): string {
  switch (getStatusTone(status)) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "danger":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    case "clientLock":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "serverLock":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    case "period":
      return "border-stone-500/30 bg-stone-500/10 text-stone-700 dark:text-stone-300"
    case "inactive":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
    default:
      return "border-muted-foreground/20 bg-muted/50 text-foreground"
  }
}

function getStatusInfo(status: string): EppStatusInfo | null {
  return EPP_STATUS_INFO[normalizeStatusKey(status)] || null
}

function StatusBadge({ status }: { status: string }) {
  const info = getStatusInfo(status)
  const badge = (
    <Badge variant="outline" className={`font-mono text-xs ${getStatusBadgeClassName(status)}`}>
      {status}
    </Badge>
  )

  if (!info) {
    return badge
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent
        sideOffset={8}
        className="max-w-sm rounded-xl border border-border/70 bg-popover/95 p-0 text-sm text-popover-foreground shadow-2xl shadow-black/15 backdrop-blur-md"
      >
        <div className="space-y-0">
          <div className="border-b border-border/70 bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${getStatusTone(status) === "success"
                ? "bg-emerald-400"
                : getStatusTone(status) === "warning"
                  ? "bg-amber-400"
                  : getStatusTone(status) === "danger"
                    ? "bg-rose-400"
                    : getStatusTone(status) === "clientLock"
                      ? "bg-sky-400"
                      : getStatusTone(status) === "serverLock"
                        ? "bg-violet-400"
                        : getStatusTone(status) === "period"
                          ? "bg-stone-400"
                          : getStatusTone(status) === "inactive"
                            ? "bg-slate-400"
                      : "bg-zinc-400"
                }`} />
              <p className="font-semibold tracking-tight text-popover-foreground">{info.label}</p>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{status}</p>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Meaning</p>
              <p className="mt-1 leading-relaxed text-popover-foreground/90">{info.summary}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">What To Do</p>
              <p className="mt-1 leading-relaxed text-popover-foreground">{info.action}</p>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const { trigger } = useHaptics()

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value)
    trigger("success")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={`h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function WhoisResults({ data, query }: WhoisResultsProps) {
  const queryType: QueryType = data._queryType || "domain"
  const source = data._source || "rdap"
  const isWhoisFallback = source === "whois"
  const [showRawJson, setShowRawJson] = useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatus = () => {
    if (data.status && Array.isArray(data.status)) {
      return data.status
    }
    return []
  }

  const getEntities = (role?: string) => {
    if (!data.entities) return []
    if (role) {
      return data.entities.filter((e: any) => e.roles?.includes(role))
    }
    return data.entities
  }

  const registrant = getEntities("registrant")[0]
  const admin = getEntities("administrative")[0]
  const tech = getEntities("technical")[0]
  const registrar = getEntities("registrar")[0]
  const allEntities = getEntities()

  const getQueryTypeLabel = () => {
    switch (queryType) {
      case "ipv4":
      case "ipv6":
        return "IP Address Information"
      case "asn":
        return "Autonomous System Information"
      default:
        return "Domain Registration Information"
    }
  }

  const getQueryTypeIcon = () => {
    switch (queryType) {
      case "ipv4":
      case "ipv6":
        return <Network className="h-5 w-5 text-primary" />
      case "asn":
        return <Hash className="h-5 w-5 text-primary" />
      default:
        return <Globe className="h-5 w-5 text-primary" />
    }
  }

  const displayName = data.name || data.handle || data.ldhName || query
  const parsedWhois = data.parsedWhois || null

  if (isWhoisFallback) {
    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-2 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="group flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-xl font-bold sm:text-2xl">{displayName}</CardTitle>
                      <CopyButton value={displayName} />
                    </div>
                    <CardDescription className="text-sm">
                      Domain WHOIS fallback response via port 43
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 font-mono text-xs uppercase">
                WHOIS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                  Source Server
                </div>
                <p className="mt-1 font-mono text-sm font-semibold">{data.sourceServer || "whois.iana.org"}</p>
              </div>
              <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Referral Server
                </div>
                <p className="mt-1 font-mono text-sm font-semibold">{data.referralServer || "None"}</p>
              </div>
              <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Fallback Reason
                </div>
                <p className="mt-1 text-sm font-semibold">{data._fallbackReason || "RDAP unavailable"}</p>
              </div>
            </div>

            {data.referralError && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5" />
                  Referral WHOIS Degraded
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.referralServer
                    ? `The referred WHOIS server ${data.referralServer} did not return a usable response. Showing IANA registry data instead.`
                    : "The referred WHOIS server did not return a usable response."}
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{data.referralError}</p>
              </div>
            )}

            {Array.isArray(data.sourceChain) && data.sourceChain.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Network className="h-3.5 w-3.5" />
                  Lookup Chain
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.sourceChain.map((server: string, idx: number) => (
                    <Badge key={`${server}-${idx}`} variant="outline" className="font-mono text-xs">
                      {server}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {parsedWhois && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Best-Effort Parsed Fields
              </CardTitle>
              <CardDescription>Heuristic extraction from raw WHOIS text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {parsedWhois.registrar && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Building className="h-3.5 w-3.5" />
                      Registrar
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.registrar}</p>
                  </div>
                )}
                {parsedWhois.registrarUrl && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Registrar URL
                    </div>
                    <p className="mt-1 break-all text-sm font-semibold">{parsedWhois.registrarUrl}</p>
                  </div>
                )}
                {parsedWhois.registrarIanaId && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Registrar IANA ID
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">{parsedWhois.registrarIanaId}</p>
                  </div>
                )}
                {parsedWhois.registrant && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Registrant
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.registrant}</p>
                  </div>
                )}
                {parsedWhois.registryDomainId && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Registry Domain ID
                    </div>
                    <p className="mt-1 break-all font-mono text-sm font-semibold">{parsedWhois.registryDomainId}</p>
                  </div>
                )}
                {parsedWhois.registrarWhoisServer && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Server className="h-3.5 w-3.5" />
                      Registrar WHOIS
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">{parsedWhois.registrarWhoisServer}</p>
                  </div>
                )}
                {parsedWhois.creationDate && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Created
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.creationDate}</p>
                  </div>
                )}
                {parsedWhois.updatedDate && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Updated
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.updatedDate}</p>
                  </div>
                )}
                {parsedWhois.expirationDate && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Expires
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.expirationDate}</p>
                  </div>
                )}
                {parsedWhois.dnssec && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      DNSSEC
                    </div>
                    <p className="mt-1 text-sm font-semibold">{parsedWhois.dnssec}</p>
                  </div>
                )}
                {(parsedWhois.registrantCity || parsedWhois.registrantState || parsedWhois.registrantCountry) && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Registrant Location
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {[parsedWhois.registrantCity, parsedWhois.registrantState, parsedWhois.registrantCountry]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {parsedWhois.status?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Parsed Status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsedWhois.status.map((status: string, idx: number) => (
                      <StatusBadge key={`${status}-${idx}`} status={status} />
                    ))}
                  </div>
                </div>
              )}

              {parsedWhois.nameservers?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Server className="h-3.5 w-3.5" />
                    Parsed Nameservers
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {parsedWhois.nameservers.map((nameserver: string) => (
                      <div
                        key={nameserver}
                        className="group flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
                      >
                        <p className="truncate font-mono text-sm font-medium">{nameserver}</p>
                        <CopyButton value={nameserver} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(parsedWhois.abuseEmail || parsedWhois.abusePhone) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {parsedWhois.abuseEmail && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        Abuse Email
                      </div>
                      <p className="mt-1 break-all text-sm font-semibold">{parsedWhois.abuseEmail}</p>
                    </div>
                  )}
                  {parsedWhois.abusePhone && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        Abuse Phone
                      </div>
                      <p className="mt-1 text-sm font-semibold">{parsedWhois.abusePhone}</p>
                    </div>
                  )}
                </div>
              )}

              {(parsedWhois.registrantId || parsedWhois.adminId || parsedWhois.techId) && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {parsedWhois.registrantId && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        Registrant ID
                      </div>
                      <p className="mt-1 break-all font-mono text-sm font-semibold">{parsedWhois.registrantId}</p>
                    </div>
                  )}
                  {parsedWhois.adminId && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        Admin ID
                      </div>
                      <p className="mt-1 break-all font-mono text-sm font-semibold">{parsedWhois.adminId}</p>
                    </div>
                  )}
                  {parsedWhois.techId && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        Tech ID
                      </div>
                      <p className="mt-1 break-all font-mono text-sm font-semibold">{parsedWhois.techId}</p>
                    </div>
                  )}
                </div>
              )}

              {parsedWhois.contacts && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Parsed Contacts
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { key: "registrant", label: "Registrant" },
                      { key: "admin", label: "Admin" },
                      { key: "tech", label: "Tech" },
                    ].map(({ key, label }) => {
                      const contact = parsedWhois.contacts[key]
                      const hasData = contact && Object.values(contact).some(Boolean)
                      if (!hasData) return null

                      return (
                        <div key={key} className="space-y-3 rounded-lg border bg-card p-4">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {label}
                          </div>
                          <div className="space-y-2 text-sm">
                            {contact.name && <p className="font-semibold">{contact.name}</p>}
                            {contact.organization && <p className="text-muted-foreground">{contact.organization}</p>}
                            {contact.email && <p className="break-all">{contact.email}</p>}
                            {contact.phone && <p>{contact.phone}</p>}
                            {(contact.city || contact.state || contact.country) && (
                              <p>{[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {data.referralServer && data.ianaResponse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                IANA Referral Response
              </CardTitle>
              <CardDescription>Raw response used to locate the authoritative WHOIS server</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap break-words">
                {data.ianaResponse}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Raw WHOIS Response
            </CardTitle>
            <CardDescription>Unstructured text returned by the WHOIS server</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap break-words">
              {data.rawWhois}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setShowRawJson(!showRawJson)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setShowRawJson(!showRawJson)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Raw API Response</CardTitle>
                <CardDescription>Complete fallback payload returned by the server</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform ${showRawJson ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          {showRawJson && (
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="relative overflow-hidden border-2 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="group flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  {getQueryTypeIcon()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="truncate text-xl font-bold sm:text-2xl">{displayName}</CardTitle>
                    <CopyButton value={displayName} />
                  </div>
                  <CardDescription className="text-sm">{getQueryTypeLabel()}</CardDescription>
                </div>
              </div>
            </div>
            {data.objectClassName && (
              <Badge variant="secondary" className="shrink-0 font-mono text-xs uppercase">
                {data.objectClassName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Dates */}
          {data.events && data.events.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.events.slice(0, 4).map((event: any, idx: number) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.eventAction?.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  <p className="mt-1 text-sm font-semibold">{formatDate(event.eventDate)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Status Badges */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              {getStatus().length > 0 ? (
                getStatus().map((status: string, idx: number) => (
                  <StatusBadge key={idx} status={status} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No status available</p>
              )}
            </div>
          </div>

          {/* Nameservers (Domain only) */}
          {queryType === "domain" && data.nameservers && data.nameservers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Server className="h-3.5 w-3.5" />
                Nameservers ({data.nameservers.length})
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.nameservers.map((ns: any, idx: number) => (
                  <div
                    key={idx}
                    className="group flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-mono text-sm font-medium">{ns.ldhName || ns.unicodeName}</p>
                      {ns.ipAddresses && (
                        <div className="flex flex-wrap gap-1">
                          {ns.ipAddresses.v4?.map((ip: string, i: number) => (
                            <Badge key={`v4-${i}`} variant="secondary" className="font-mono text-xs">
                              {ip}
                            </Badge>
                          ))}
                          {ns.ipAddresses.v6?.map((ip: string, i: number) => (
                            <Badge key={`v6-${i}`} variant="secondary" className="font-mono text-xs">
                              {ip}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <CopyButton value={ns.ldhName || ns.unicodeName} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IP Network Information */}
          {(queryType === "ipv4" || queryType === "ipv6") && (
            <div className="space-y-4">
              {/* IP Version & Handle */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.ipVersion && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Network className="h-3.5 w-3.5" />
                      IP Version
                    </div>
                    <p className="mt-1 text-sm font-semibold">IPv{data.ipVersion}</p>
                  </div>
                )}
                {data.handle && (
                  <div className="group rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        Handle
                      </div>
                      <CopyButton value={data.handle} />
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">{data.handle}</p>
                  </div>
                )}
                {data.type && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Type
                    </div>
                    <p className="mt-1 text-sm font-semibold">{data.type}</p>
                  </div>
                )}
              </div>

              {/* CIDR Blocks */}
              {data.cidr0_cidrs && data.cidr0_cidrs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Network className="h-3.5 w-3.5" />
                    CIDR Blocks
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.cidr0_cidrs.map((cidr: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="font-mono text-xs">
                        {cidr.v4prefix || cidr.v6prefix}/{cidr.length}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Start/End Address */}
              {(data.startAddress || data.endAddress) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.startAddress && (
                    <div className="group rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Start Address
                        </div>
                        <CopyButton value={data.startAddress} />
                      </div>
                      <p className="mt-1 font-mono text-sm font-medium">{data.startAddress}</p>
                    </div>
                  )}
                  {data.endAddress && (
                    <div className="group rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          End Address
                        </div>
                        <CopyButton value={data.endAddress} />
                      </div>
                      <p className="mt-1 font-mono text-sm font-medium">{data.endAddress}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Parent Handle */}
              {data.parentHandle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <LinkIcon className="h-3.5 w-3.5" />
                    Parent Network
                  </div>
                  <p className="font-mono text-sm">{data.parentHandle}</p>
                </div>
              )}
            </div>
          )}

          {/* ASN Information */}
          {queryType === "asn" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.startAutnum !== undefined && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      ASN Range Start
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">AS{data.startAutnum}</p>
                  </div>
                )}
                {data.endAutnum !== undefined && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      ASN Range End
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">AS{data.endAutnum}</p>
                  </div>
                )}
                {data.type && (
                  <div className="rounded-lg border bg-linear-to-br from-muted/30 to-muted/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Type
                    </div>
                    <p className="mt-1 text-sm font-semibold">{data.type}</p>
                  </div>
                )}
              </div>

              {/* Country */}
              {data.country && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    Country
                  </div>
                  <p className="text-sm font-medium">{data.country}</p>
                </div>
              )}
            </div>
          )}

          {/* DNSSEC */}
          {data.secureDNS && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                DNSSEC
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Zone Signed:</span>
                    <Badge variant={data.secureDNS.zoneSigned ? "default" : "secondary"} className="text-xs">
                      {data.secureDNS.zoneSigned ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {data.secureDNS.delegationSigned !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Delegation:</span>
                      <Badge variant={data.secureDNS.delegationSigned ? "default" : "secondary"} className="text-xs">
                        {data.secureDNS.delegationSigned ? "Yes" : "No"}
                      </Badge>
                    </div>
                  )}
                </div>
                {data.secureDNS.dsData && data.secureDNS.dsData.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">DS Records</p>
                    {data.secureDNS.dsData.map((ds: any, idx: number) => (
                      <div key={idx} className="space-y-0.5 rounded-md bg-muted/50 p-3 font-mono text-xs">
                        <div>
                          Key: {ds.keyTag} | Algo: {ds.algorithm} | Type: {ds.digestType}
                        </div>
                        <div className="break-all text-muted-foreground">{ds.digest}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {data.port43 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Legacy WHOIS
              </div>
              <p className="font-mono text-sm">{data.port43}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entities Section */}
      {allEntities.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Contacts & Organizations
            </CardTitle>
            <CardDescription>Entity information and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">All Entities</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {registrant && (
                    <div className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Registrant
                      </div>
                      <EntityInfo entity={registrant} compact />
                    </div>
                  )}

                  {registrar && (
                    <div className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Building className="h-3.5 w-3.5" />
                        Registrar
                      </div>
                      <EntityInfo entity={registrar} compact />
                    </div>
                  )}

                  {admin && (
                    <div className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Administrative
                      </div>
                      <EntityInfo entity={admin} compact />
                    </div>
                  )}

                  {tech && (
                    <div className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Technical
                      </div>
                      <EntityInfo entity={tech} compact />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="mt-6 space-y-4">
                {allEntities.map((entity: any, idx: number) => (
                  <div key={idx} className="space-y-4 rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-mono text-sm font-medium">{entity.handle || `Entity ${idx + 1}`}</p>
                        <div className="flex flex-wrap gap-1">
                          {entity.roles?.map((role: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <EntityInfo entity={entity} detailed />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Notices & Remarks */}
      {((data.notices && data.notices.length > 0) || (data.remarks && data.remarks.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-primary" />
              Notices & Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.notices?.map((notice: any, idx: number) => (
              <div key={`notice-${idx}`} className="space-y-2 rounded-lg border bg-card p-4">
                {notice.title && <p className="text-sm font-medium">{notice.title}</p>}
                {notice.description?.map((desc: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {desc}
                  </p>
                ))}
                {notice.links && notice.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {notice.links.map((link: any, i: number) => (
                      <a
                        key={i}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {link.rel || "Link"}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {data.remarks?.map((remark: any, idx: number) => (
              <div key={`remark-${idx}`} className="space-y-2 rounded-lg border bg-muted/30 p-4">
                {remark.title && <p className="text-sm font-medium">{remark.title}</p>}
                {remark.description?.map((desc: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {desc}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Links */}
      {data.links && data.links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5 text-primary" />
              Related Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.links.map((link: any, idx: number) => (
                <a
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium transition-colors group-hover:text-primary">
                      {link.rel || "Link"}
                    </p>
                    {link.type && (
                      <Badge variant="secondary" className="text-xs">
                        {link.type}
                      </Badge>
                    )}
                  </div>
                  <LinkIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Public IDs */}
      {data.publicIds && data.publicIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Public Identifiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.publicIds.map((id: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <span className="text-sm font-medium">{id.type}</span>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{id.identifier}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON - Collapsible */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowRawJson(!showRawJson)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowRawJson(!showRawJson)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Raw RDAP Response</CardTitle>
              <CardDescription>Complete JSON data from the RDAP server</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${showRawJson ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        {showRawJson && (
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function EntityInfo({
  entity,
  compact = false,
  detailed = false,
}: { entity: any; compact?: boolean; detailed?: boolean }) {
  const vcard = entity.vcardArray?.[1]

  const getVcardValue = (type: string) => {
    const item = vcard?.find((v: any) => v[0] === type)
    if (Array.isArray(item?.[3])) {
      return item[3].filter(Boolean).join(", ")
    }
    return item?.[3] || null
  }

  const getAllVcardValues = (type: string) => {
    return vcard?.filter((v: any) => v[0] === type) || []
  }

  const name = getVcardValue("fn")
  const org = getVcardValue("org")
  const emails = getAllVcardValues("email")
  const phones = getAllVcardValues("tel")
  const addresses = getAllVcardValues("adr")

  return (
    <div className="space-y-2">
      {name && <p className="text-sm font-semibold">{name}</p>}

      {org && (
        <div className="flex items-start gap-2 text-sm">
          <Building className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{org}</span>
        </div>
      )}

      {emails.length > 0 && (
        <div className="space-y-1">
          {emails.slice(0, compact ? 1 : emails.length).map((email: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-mono text-xs">{email[3]}</span>
            </div>
          ))}
        </div>
      )}

      {phones.length > 0 && detailed && (
        <div className="space-y-1">
          {phones.map((phone: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-mono text-xs">{phone[3]}</span>
            </div>
          ))}
        </div>
      )}

      {addresses.length > 0 && detailed && (
        <div className="space-y-1">
          {addresses.map((addr: any, idx: number) => {
            const parts = addr[3].filter(Boolean)
            if (parts.length === 0) return null
            return (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs">{parts.join(", ")}</span>
              </div>
            )
          })}
        </div>
      )}

      {detailed && entity.status && entity.status.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2">
          {entity.status.map((status: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="font-mono text-xs">
              {status}
            </Badge>
          ))}
        </div>
      )}

      {detailed && entity.events && entity.events.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Events</p>
          {entity.events.map((event: any, idx: number) => (
            <div key={idx} className="text-xs text-muted-foreground">
              {event.eventAction}: {new Date(event.eventDate).toLocaleDateString()}
            </div>
          ))}
        </div>
      )}

      {detailed && entity.entities && entity.entities.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sub-Entities</p>
          {entity.entities.map((subEntity: any, idx: number) => (
            <div key={idx} className="space-y-1 border-l-2 pl-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{subEntity.handle}</span>
                {subEntity.roles && (
                  <div className="flex gap-1">
                    {subEntity.roles.map((role: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
