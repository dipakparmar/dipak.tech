import { ArrowLeft, Cpu, Lock, Music4 } from "lucide-react"

import { BlurFade } from "@/components/magicui/blur-fade"
import Link from "next/link"
import { StemSplitter } from "@/components/stem-splitter/stem-splitter"
import { buildHref } from "@/lib/host-routing"
import { headers } from "next/headers"
import { ogUrls } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "Vocal Remover",
  description: "Remove vocals or split any song into stems, free and in your browser",
  category: "vocal-remover",
})

export const metadata = {
  title: "Vocal Remover & Stem Splitter | Dipak Parmar",
  description:
    "Free AI vocal remover. Remove vocals from any song or isolate vocals, drums, and bass to make karaoke, instrumentals, or acapellas. Powered by HTDemucs, runs 100% in your browser with WebGPU. Your audio never leaves your device.",
  keywords: [
    "vocal remover",
    "remove vocals from song",
    "isolate vocals",
    "stem splitter",
    "acapella extractor",
    "karaoke maker",
    "instrumental maker",
    "split song into stems",
  ],
  openGraph: {
    title: "Free Vocal Remover & Stem Splitter",
    description: "Remove vocals or split any song into vocals, drums, bass, and other stems. Free, in your browser.",
    url: "https://tools.dipak.io/music/vocal-remover",
    siteName: "tools.dipak.io",
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Vocal Remover & Stem Splitter" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Free Vocal Remover & Stem Splitter | Dipak Parmar",
    description: "Remove vocals or split any song into stems. Free, in your browser.",
    images: [ogImageUrl],
  },
  alternates: { canonical: "https://tools.dipak.io/music/vocal-remover" },
}

const BLUR_FADE_DELAY = 0.04

export default async function VocalRemoverPage() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const musicHref = buildHref("tools", "music", host)
  return (
    <main className="min-h-screen overflow-x-clip bg-background">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-sky-500/20 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10 sm:py-16 md:py-24 pointer-events-auto">
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-14">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-2">
              <Link
                href={musicHref}
                aria-label="Back to Music Tools"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                </span>
                <span className="text-sm font-medium">Vocal Remover &amp; Stem Splitter</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Vocal Remover</h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Remove vocals from any song, or split it into four stems (vocals, drums, bass, and
                other) to make karaoke tracks, instrumentals, or acapellas. Powered by the HTDemucs AI
                model running right in your browser. The first run downloads the model once (~180 MB),
                then it&apos;s cached. Your audio never leaves your device.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Client-Side Only</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Cpu className="h-4 w-4" />
                  <span>WebGPU Accelerated</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Music4 className="h-4 w-4" />
                  <span>4-Stem HTDemucs</span>
                </div>
              </div>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <StemSplitter />
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
