import { Globe, Hash, Network } from "lucide-react"

import { BlurFade } from "@/components/magicui/blur-fade"
import { Suspense } from "react"
import { WhoisLookup } from "@/components/whois-lookup"

const BLUR_FADE_DELAY = 0.04

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      {/* Gradient background effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-14">
          {/* Hero Section */}
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium">OSINT Command Center</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Domain & IP Intelligence
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Investigate domains, IPs, and autonomous systems with live DNS, HTTP, TLS, and geo intelligence.
                Powered by RDAP and OSINT APIs.
              </p>
              {/* Feature pills */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Domains & RDAP</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Network className="h-4 w-4" />
                  <span>DNS & IP Intel</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>ASN & TLS Signals</span>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Search Component */}
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}>
              <WhoisLookup />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
