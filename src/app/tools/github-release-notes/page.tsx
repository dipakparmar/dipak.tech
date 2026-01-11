import { BlurFade } from "@/components/magicui/blur-fade"
import { ReleaseNotesTool } from "@/components/release-notes-tool"
import { FileText, Filter, Github, Layers } from "lucide-react"
import { Suspense } from "react"

export const metadata = {
  title: "GitHub Release Notes | Dipak Parmar",
  description: "Combine and export GitHub release notes with version filters.",
}

const BLUR_FADE_DELAY = 0.04

export default function GitHubReleaseNotesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#0f172a10_1px,transparent_1px),linear-gradient(to_bottom,#0f172a10_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-80 w-80 rounded-full bg-primary/20 opacity-30 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-12">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium">
                <Github className="h-4 w-4" />
                GitHub Release Notes
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Release Notes Combiner
                </h1>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                  Merge, filter, and export release notes from any GitHub repository. Built for changelog
                  reviews, launch notes, and migration prep.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Version range filters
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Combined markdown view
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Print & export ready
                </div>
              </div>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl border bg-muted/40" />}>
              <ReleaseNotesTool />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
