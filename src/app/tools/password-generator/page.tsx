import { Lock, ShieldCheck, Share2 } from "lucide-react"

import { BlurFade } from "@/components/magicui/blur-fade"
import { Suspense } from "react"
import { PasswordGenerator } from "@/components/password-generator/password-generator"
import { ogUrls } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "Password Generator",
  description: "Generate secure passwords, passphrases, PINs, salts, and API keys",
  category: "password-generator",
})

export const metadata = {
  title: "Password Generator | Dipak Parmar",
  description:
    "Generate cryptographically secure passwords, passphrases, PINs, salts, API keys, and UUIDs. All generation happens client-side.",
  openGraph: {
    title: "Password Generator",
    description: "Generate secure passwords, passphrases, PINs, salts, and API keys",
    url: "https://tools.dipak.io/password-generator",
    siteName: "tools.dipak.io",
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Password Generator" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Password Generator | Dipak Parmar",
    description: "Generate secure passwords, passphrases, PINs, salts, and API keys",
    images: [ogImageUrl],
  },
  alternates: { canonical: "https://tools.dipak.io/password-generator" },
}

const BLUR_FADE_DELAY = 0.04

export default function PasswordGeneratorPage() {
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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                <span className="text-sm font-medium">Password Generator</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Secure Password Generator
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Generate cryptographically secure passwords, passphrases, PINs, salts, API keys, and
                UUIDs. Everything runs client-side in your browser.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Client-Side Only</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Cryptographically Secure</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Share2 className="h-4 w-4" />
                  <span>Shareable Config</span>
                </div>
              </div>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <PasswordGenerator />
            </Suspense>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
