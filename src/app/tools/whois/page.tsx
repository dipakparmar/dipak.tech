import { Globe, Hash, Network } from "lucide-react"

import { BlurFade } from "@/components/magicui/blur-fade"
import { Suspense } from "react"
import { WhoisTool } from "@/components/whois-tool"
import { ogUrls, siteConfig } from "@/lib/og-config"

const ogImageUrl = ogUrls.whois({
  tool: "WHOIS Lookup",
  description: "Domain, IP, and ASN registration lookup via RDAP",
  category: "whois",
})

export const metadata = {
  title: "WHOIS Lookup | Dipak Parmar",
  description: "Look up domain registration, IP network, and ASN information using RDAP protocol",
  openGraph: {
    title: "WHOIS Lookup",
    description: "Domain, IP, and ASN registration lookup via RDAP protocol",
    url: siteConfig.whois.baseUrl,
    siteName: siteConfig.whois.domain,
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "WHOIS Lookup",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WHOIS Lookup | Dipak Parmar",
    description: "Domain, IP, and ASN registration lookup via RDAP protocol",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: siteConfig.whois.baseUrl,
  },
}

const BLUR_FADE_DELAY = 0.04

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="text-sm font-medium">WHOIS Lookup</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Domain & IP Registration
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Look up registration details for domains, IP addresses, and autonomous systems
                using the RDAP protocol.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Domain WHOIS</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Network className="h-4 w-4" />
                  <span>IP Networks</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>ASN Lookup</span>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Search Component */}
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}>
              <WhoisTool />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
