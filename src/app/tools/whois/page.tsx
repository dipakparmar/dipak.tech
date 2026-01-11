import { BlurFade } from "@/components/magicui/blur-fade"
import { WhoisLookup } from "@/components/whois-lookup"
import { Globe, Hash, Network } from "lucide-react"
import { Suspense } from "react"

const BLUR_FADE_DELAY = 0.04

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      {/* Gradient background effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl space-y-16">
          {/* Hero Section */}
          <div className="space-y-6 text-center">
            <BlurFade delay={BLUR_FADE_DELAY}>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-sm px-4 py-1.5 text-xs font-medium shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Powered by RDAP Protocol
              </div>
            </BlurFade>

            <BlurFade delay={BLUR_FADE_DELAY * 2}>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Network Intelligence
              </h1>
            </BlurFade>

            <BlurFade delay={BLUR_FADE_DELAY * 3}>
              <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl">
                Query comprehensive registration data for domains, IP addresses, and autonomous systems using the
                modern RDAP API
              </p>
            </BlurFade>

            {/* Feature pills */}
            <BlurFade delay={BLUR_FADE_DELAY * 4}>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Domains</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Network className="h-4 w-4" />
                  <span>IP Addresses</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>ASN Lookup</span>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Search Component */}
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}>
              <WhoisLookup />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
