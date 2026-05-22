import { CalendarHeart, Globe, Download } from "lucide-react"
import { Suspense } from "react"

import { BlurFade } from "@/components/magicui/blur-fade"
import { TimeoffOptimizerTool } from "@/components/timeoff-optimizer/timeoff-optimizer-tool"
import { ogUrls } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "Time-off Optimizer",
  description: "Maximize your PTO by stacking days off around weekends and holidays",
  category: "timeoff-optimizer",
})

export const metadata = {
  title: "Time-off Optimizer | Dipak Parmar",
  description:
    "Plan the perfect year of vacations. Stack your PTO days around weekends, public holidays, and company days off to maximize time off.",
  openGraph: {
    title: "Time-off Optimizer",
    description: "Maximize your PTO by stacking days off around weekends, public holidays, and company days.",
    url: "https://tools.dipak.io/timeoff-optimizer",
    siteName: "tools.dipak.io",
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Time-off Optimizer" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Time-off Optimizer | Dipak Parmar",
    description: "Stack your PTO around weekends and holidays for the most time off.",
    images: [ogImageUrl],
  },
  alternates: { canonical: "https://tools.dipak.io/timeoff-optimizer" },
}

const BLUR_FADE_DELAY = 0.04

export default function TimeoffOptimizerPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 pointer-events-auto">
        <div className="mx-auto max-w-6xl space-y-14">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-sm font-medium">Time-off Optimizer</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Make every PTO day count
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Plan your year by stacking time off around weekends, public holidays, and company
                days. Pick a strategy and we&rsquo;ll find the dates that give you the most rest.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <CalendarHeart className="h-4 w-4 text-primary" />
                  <span>5 strategies</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>200+ countries</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>Export to calendar</span>
                </div>
              </div>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <TimeoffOptimizerTool />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
