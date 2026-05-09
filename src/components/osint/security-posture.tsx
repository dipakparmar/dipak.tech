"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Mail, Server, Lock, Key } from "lucide-react"
import type { SecurityData, EmailSecurityResult, WAFResult } from "@/lib/osint-types"

interface SecurityPostureProps {
  securityData: SecurityData | null
  emailSecurity: EmailSecurityResult | null
  waf: WAFResult | null
  pending: boolean
  error?: string
}

function StatusBadge({ pass, label }: { pass: boolean | null; label: string }) {
  if (pass === null) return <Badge variant="outline" className="text-muted-foreground">{label}</Badge>
  return pass ? (
    <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-950">{label}</Badge>
  ) : (
    <Badge className="bg-red-950 text-red-400 border-red-900 hover:bg-red-950">{label}</Badge>
  )
}

function WarnBadge({ label }: { label: string }) {
  return <Badge className="bg-amber-950 text-amber-400 border-amber-900 hover:bg-amber-950">{label}</Badge>
}

export function SecurityPosture({ securityData, emailSecurity, waf, pending, error }: SecurityPostureProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
        Security Posture unavailable: {error}
      </div>
    )
  }

  if (pending || (!securityData && !emailSecurity && !waf)) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    )
  }

  const spfPolicy = emailSecurity?.spf.policy
  const dmarcPolicy = emailSecurity?.dmarc.policy

  return (
    <div className="space-y-3">
      {/* WAF + DNSSEC row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* WAF */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WAF / CDN</span>
          </div>
          {waf?.detected ? (
            <div>
              <div className="mb-2 text-base font-semibold">{waf.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {waf.capabilities.map((cap) => (
                  <Badge key={cap} className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">None detected</div>
          )}
        </div>

        {/* DNSSEC */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNSSEC</span>
          </div>
          {securityData ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge pass={securityData.dnssec.enabled} label={securityData.dnssec.enabled ? "Enabled" : "Disabled"} />
              </div>
              {securityData.dnssec.algorithm && (
                <div className="text-xs text-muted-foreground">{securityData.dnssec.algorithm}</div>
              )}
            </div>
          ) : (
            <Skeleton className="h-8 w-full" />
          )}
        </div>
      </div>

      {/* Email security row — SPF / DMARC / DKIM / BIMI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* SPF */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SPF</span>
          </div>
          {emailSecurity ? (
            <>
              {spfPolicy === "softfail" ? (
                <WarnBadge label="Soft Fail" />
              ) : (
                <StatusBadge
                  pass={spfPolicy === "fail"}
                  label={spfPolicy === "fail" ? "Enforced (-all)" : spfPolicy === "none" ? "Not Set" : "Neutral"}
                />
              )}
              {emailSecurity.spf.record && (
                <div className="mt-2 truncate rounded bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                  {emailSecurity.spf.record}
                </div>
              )}
            </>
          ) : <Skeleton className="h-6 w-24" />}
        </div>

        {/* DMARC */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DMARC</span>
          </div>
          {emailSecurity ? (
            <>
              <StatusBadge
                pass={dmarcPolicy === "reject" || dmarcPolicy === "quarantine"}
                label={dmarcPolicy === "reject" ? "Reject" : dmarcPolicy === "quarantine" ? "Quarantine" : "None"}
              />
              {emailSecurity.dmarc.record && (
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  {emailSecurity.dmarc.reporting && <WarnBadge label="rua reporting" />}
                  {emailSecurity.dmarc.pct < 100 && <WarnBadge label={`${emailSecurity.dmarc.pct}% policy`} />}
                </div>
              )}
            </>
          ) : <Skeleton className="h-6 w-24" />}
        </div>

        {/* DKIM */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DKIM</span>
          </div>
          {securityData ? (
            <>
              {securityData.dkim.wildcard ? (
                <WarnBadge label="Wildcard" />
              ) : securityData.dkim.selectors.length > 0 ? (
                <StatusBadge pass={true} label="Configured" />
              ) : (
                <StatusBadge pass={false} label="Not Found" />
              )}
              {!securityData.dkim.wildcard && securityData.dkim.selectors.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">{securityData.dkim.selectors.join(", ")}</div>
              )}
            </>
          ) : <Skeleton className="h-6 w-24" />}
        </div>

        {/* BIMI */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">BIMI</span>
          </div>
          {emailSecurity ? (
            <StatusBadge pass={emailSecurity.bimi.present} label={emailSecurity.bimi.present ? "Configured" : "Not Set"} />
          ) : <Skeleton className="h-6 w-24" />}
        </div>
      </div>

      {/* Blocklist */}
      {securityData && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocklist Status</span>
            </div>
            <span className="text-sm font-semibold">
              <span className={securityData.blocklist.clean === securityData.blocklist.total ? "text-emerald-400" : "text-red-400"}>
                {securityData.blocklist.clean}
              </span>
              <span className="text-muted-foreground">/{securityData.blocklist.total} clean</span>
            </span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${securityData.blocklist.clean === securityData.blocklist.total ? "bg-emerald-500" : securityData.blocklist.clean > securityData.blocklist.total / 2 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${securityData.blocklist.total > 0 ? (securityData.blocklist.clean / securityData.blocklist.total) * 100 : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {securityData.blocklist.results.map((r) => (
              <div key={r.name} className="flex items-center gap-1.5 text-xs">
                {r.listed ? (
                  <ShieldOff className="h-3 w-3 shrink-0 text-red-400" />
                ) : (
                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                )}
                <span className={r.listed ? "text-red-400" : "text-muted-foreground"}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
