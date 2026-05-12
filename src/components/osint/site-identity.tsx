"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Code2, Globe, Cookie, ShieldCheck } from "lucide-react"
import type { TechStackResult, SocialTagsResult, CookieInfo, IdentityData } from "@/lib/osint-types"
import Image from "next/image"

interface SiteIdentityProps {
  techStack: TechStackResult | null
  socialTags: SocialTagsResult | null
  cookies: CookieInfo[] | null
  identityData: IdentityData | null
  pending: boolean
  error?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  cdn: "bg-amber-950 text-amber-300 border-amber-900",
  framework: "bg-cyan-950 text-cyan-300 border-cyan-900",
  cms: "bg-purple-950 text-purple-300 border-purple-900",
  analytics: "bg-blue-950 text-blue-300 border-blue-900",
  server: "bg-zinc-800 text-zinc-300 border-zinc-700",
}

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">{label}</span>
  ) : (
    <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-red-950 text-red-400 border border-red-900">No {label}</span>
  )
}

export function SiteIdentity({ techStack, socialTags, cookies, identityData, pending, error }: SiteIdentityProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
        Site Identity unavailable: {error}
      </div>
    )
  }

  if (pending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="col-span-2 h-24 rounded-2xl" />
      </div>
    )
  }

  const hasStack = techStack && Object.values(techStack).some((arr) => arr.length > 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Tech Stack */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technology Stack</span>
          </div>
          {hasStack ? (
            <div className="space-y-2">
              {(["cdn", "framework", "cms", "analytics", "server"] as const).map((cat) => {
                const items = techStack[cat]
                if (!items.length) return null
                return (
                  <div key={cat} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground capitalize w-16 shrink-0">{cat}</span>
                    {items.map((item) => (
                      <Badge key={item} className={`text-xs ${CATEGORY_COLORS[cat]}`}>{item}</Badge>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No technology detected</div>
          )}
        </div>

        {/* Social Tags */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Tags</span>
          </div>
          {socialTags ? (
            <div className="space-y-2">
              {socialTags.og.imageProxySrc && (
                <div className="w-full overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={socialTags.og.imageProxySrc}
                    alt="OG image"
                    width={1200}
                    height={630}
                    className="w-full h-auto"
                    unoptimized
                  />
                </div>
              )}
              {socialTags.og.title && (
                <div className="text-sm font-medium line-clamp-1">{socialTags.og.title}</div>
              )}
              {socialTags.og.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">{socialTags.og.description}</div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {socialTags.og.type && (
                  <Badge variant="outline" className="text-xs">{socialTags.og.type}</Badge>
                )}
                {socialTags.twitter.card && (
                  <Badge variant="outline" className="text-xs">{socialTags.twitter.card}</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No social tags found</div>
          )}
        </div>
      </div>

      {/* security.txt */}
      {identityData && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">security.txt</span>
            {identityData.securityTxt.found ? (
              <Badge className="ml-auto bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">Found</Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">Not Found</Badge>
            )}
          </div>
          {identityData.securityTxt.found && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {identityData.securityTxt.contact && (
                <div>
                  <div className="text-xs text-muted-foreground">Contact</div>
                  <div className="truncate text-xs font-mono text-foreground">{identityData.securityTxt.contact}</div>
                </div>
              )}
              {identityData.securityTxt.expires && (
                <div>
                  <div className="text-xs text-muted-foreground">Expires</div>
                  <div className="text-xs text-foreground">{identityData.securityTxt.expires.slice(0, 10)}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Bug Bounty</div>
                <div className="mt-0.5">
                  {identityData.securityTxt.bugBounty ? (
                    <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-xs">Yes</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">No</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cookies */}
      {cookies && cookies.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Cookie className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cookies ({cookies.length})
            </span>
          </div>
          <div className="space-y-2">
            {cookies.map((cookie, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
                <span className="font-mono text-xs text-foreground">{cookie.name}</span>
                <div className="flex flex-wrap gap-1">
                  <FlagBadge ok={cookie.secure} label="Secure" />
                  <FlagBadge ok={cookie.httpOnly} label="HttpOnly" />
                  {cookie.sameSite ? (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold border ${cookie.sameSite === "None" ? "bg-amber-950 text-amber-400 border-amber-900" : "bg-emerald-950 text-emerald-400 border-emerald-800"}`}>
                      {cookie.sameSite}
                    </span>
                  ) : (
                    <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900">No SameSite</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
