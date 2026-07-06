import { ArrowLeft, AudioLines, Headphones, Music2, Piano, Wand2, Waves } from "lucide-react"
import type { CollectionPage, ItemList, ListItem, WithContext } from "schema-dts"

import { BlurFade } from "@/components/magicui/blur-fade"
import { JsonLd } from "@/components/seo/json-ld"
import Link from "next/link"
import { ToolCard } from "@/components/tool-card"
import { buildHref } from "@/lib/host-routing"
import { headers } from "next/headers"
import { ogUrls } from "@/lib/og-config"
import { personReference, personSchema } from "@/lib/schema"

const ogImageUrl = ogUrls.tools({
  tool: "Music Tools",
  description: "Browser-based music and audio tools - 8D maker, and more",
  category: "music",
})

export const metadata = {
  title: "Music & Audio Tools | Dipak Parmar",
  description:
    "Browser-based music and audio tools. Turn songs into immersive 8D audio, with more (auto-tune, beat maker, MIDI player) on the way. Everything runs client-side.",
  openGraph: {
    title: "Music & Audio Tools",
    description: "Browser-based music and audio tools - 8D maker, and more on the way",
    url: "https://tools.dipak.io/music",
    siteName: "tools.dipak.io",
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Music & Audio Tools by Dipak Parmar" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Music & Audio Tools | Dipak Parmar",
    description: "Browser-based music and audio tools - 8D maker, and more on the way",
    images: [ogImageUrl],
  },
  alternates: { canonical: "https://tools.dipak.io/music" },
}

const BLUR_FADE_DELAY = 0.04

type MusicTool = {
  title: string
  description: string
  path: string
  icon: React.ElementType
  color: string
  borderColor: string
  iconBg: string
  tagBg: string
  hoverBg: string
  span?: 2
  stat: string
  tags: string[]
}

const tools: MusicTool[] = [
  {
    title: "8D Audio Maker",
    description: "Turn any song into immersive 8D audio with Smart auto-automation and a timeline editor",
    path: "music/8d-audio",
    icon: Headphones,
    color: "text-sky-500",
    borderColor: "hover:border-sky-500/30",
    iconBg: "bg-sky-500/10",
    tagBg: "bg-sky-500/10 text-sky-500",
    hoverBg: "hover:bg-sky-500/10",
    span: 2,
    stat: "Client-side · Beat-synced Smart 8D",
    tags: ["8D Effect", "Smart 8D", "Timeline", "WAV Export"],
  },
]

type ComingSoon = {
  title: string
  description: string
  icon: React.ElementType
  color: string
  iconBg: string
}

const comingSoon: ComingSoon[] = [
  {
    title: "Auto-Tune",
    description: "Pitch correction and vocal effects in the browser",
    icon: Wand2,
    color: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  {
    title: "Beat Maker",
    description: "Step sequencer and drum machine",
    icon: AudioLines,
    color: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    title: "MIDI Player",
    description: "Load and play MIDI files with a soundfont synth",
    icon: Piano,
    color: "text-purple-500",
    iconBg: "bg-purple-500/10",
  },
]

const websiteRef = { "@id": "https://tools.dipak.io#website" }

const musicListSchema: WithContext<ItemList> = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "https://tools.dipak.io/music#tools",
  name: "Music & Audio Tools",
  itemListElement: tools.map(
    (tool, index): ListItem => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.title,
      url: `https://tools.dipak.io/${tool.path}`,
    })
  ),
}

const musicPageSchema: WithContext<CollectionPage> = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://tools.dipak.io/music#collection",
  url: "https://tools.dipak.io/music",
  name: "Music & Audio Tools",
  description: "Browser-based music and audio tools.",
  isPartOf: websiteRef,
  publisher: personReference,
  mainEntity: { "@id": "https://tools.dipak.io/music#tools" },
}

export default async function MusicToolsPage() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const getHref = (path: string) => buildHref("tools", path, host)

  return (
    <>
      <JsonLd data={[personSchema, musicListSchema, musicPageSchema]} />
      <main className="flex min-h-dvh flex-col bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-4">
              <Link
                href={getHref("")}
                aria-label="Back to all tools"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full border bg-muted/50 px-4 py-1.5">
                <Music2 className="mr-2 h-4 w-4 text-sky-500" />
                <span className="text-sm font-medium">Music & Audio Tools</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Music & Audio Tools</h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                A growing set of browser-based music tools. Everything runs client-side - your audio
                never leaves your device.
              </p>
            </div>
          </BlurFade>

          {/* Active tools */}
          <div className="mx-auto grid max-w-3xl grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, index) => (
              <BlurFade
                key={tool.path}
                delay={BLUR_FADE_DELAY * (index + 2)}
                className={tools.length === 1 ? "sm:col-span-2 lg:col-span-3" : tool.span === 2 ? "sm:col-span-2 lg:col-span-2" : ""}
              >
                <ToolCard
                  href={getHref(tool.path)}
                  color={tool.color}
                  hoverBg={tool.hoverBg}
                  borderColor={tool.borderColor}
                  iconBg={tool.iconBg}
                  tagBg={tool.tagBg}
                  icon={<tool.icon className={`h-5 w-5 ${tool.color}`} />}
                  title={tool.title}
                  description={tool.description}
                  stat={tool.stat}
                  tags={tool.tags}
                />
              </BlurFade>
            ))}
          </div>

          {/* Coming soon */}
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div className="mx-auto mt-10 max-w-3xl">
              <div className="mb-3 flex items-center gap-2">
                <Waves className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">Coming soon</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {comingSoon.map((tool) => (
                  <div
                    key={tool.title}
                    className="relative overflow-hidden rounded-xl border border-dashed bg-card/50 p-5"
                  >
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${tool.iconBg}`}>
                      <tool.icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{tool.title}</h3>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Soon
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>

        <footer className="mt-auto pb-8 pt-16">
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <p className="text-center text-sm text-muted-foreground">
              Made with <span className="text-red-500">❤️</span> by{" "}
              <Link
                href="https://dipak.tech"
                className="font-medium text-foreground transition-colors hover:text-blue-500"
              >
                Dipak Parmar
              </Link>{" "}
              in Canada 🇨🇦
            </p>
          </BlurFade>
        </footer>
      </main>
    </>
  )
}
