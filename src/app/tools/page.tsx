import Link from "next/link"
import { headers } from "next/headers"
import type { CollectionPage, ItemList, ListItem, WebSite, WithContext } from "schema-dts"

import { BlurFade } from "@/components/magicui/blur-fade"
import { JsonLd } from "@/components/seo/json-ld"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Globe, Wrench, Github, Terminal, Network } from "lucide-react"
import { buildHref } from "@/lib/host-routing"
import { ogUrls } from "@/lib/og-config"
import { personSchema, personReference } from "@/lib/schema"

const ogImageUrl = ogUrls.tools({
  tool: "Developer Tools",
  description: "Free online SSL certificate utilities, OSINT scanner, and more",
  category: "default",
})

export const metadata = {
  title: "Developer Tools | Dipak Parmar",
  description: "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
  openGraph: {
    title: "Developer Tools",
    description: "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
    url: "https://tools.dipak.io",
    siteName: "tools.dipak.io",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Developer Tools by Dipak Parmar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Tools | Dipak Parmar",
    description: "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tools.dipak.io",
  },
}

const BLUR_FADE_DELAY = 0.04

const tools = [
  {
    title: "Certificate Tools",
    description: "Search CT logs, decode certificates, generate CSRs and key pairs",
    path: "certificates",
    icon: Shield,
    color: "text-cyan-500",
  },
  {
    title: "IP Information",
    description: "View your IP address details, lookup any IP, and get geolocation data",
    path: "ip",
    icon: Network,
    color: "text-blue-500",
  },
  {
    title: "OSINT Scanner",
    description: "WHOIS lookup, DNS records, IP geolocation, and domain intelligence",
    path: "osint",
    icon: Globe,
    color: "text-emerald-500",
  },
  {
    title: "Release Notes",
    description: "Combine GitHub releases into a single, exportable changelog",
    path: "github-release-notes",
    icon: Github,
    color: "text-slate-600 dark:text-slate-300",
  },
  {
    title: "Web Terminal",
    description: "Browser-based terminal for Serial, WebSocket, SSH, and Telnet",
    path: "web-terminal",
    icon: Terminal,
    color: "text-violet-500",
  },
]

const websiteSchema: WithContext<WebSite> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://tools.dipak.io#website",
  url: "https://tools.dipak.io",
  name: "Developer Tools",
  description:
    "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
  publisher: personReference,
}

const toolsListSchema: WithContext<ItemList> = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "https://tools.dipak.io#tools",
  name: "Developer Tools",
  itemListElement: tools.map(
    (tool, index): ListItem => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.title,
      url: `https://tools.dipak.io/${tool.path}`,
    })
  ),
}

const toolsPageSchema: WithContext<CollectionPage> = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://tools.dipak.io#collection",
  url: "https://tools.dipak.io",
  name: "Developer Tools",
  description:
    "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
  isPartOf: {
    "@id": "https://tools.dipak.io#website",
  },
  mainEntity: {
    "@id": "https://tools.dipak.io#tools",
  },
}

export default async function ToolsPage() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const getHref = (path: string) => buildHref('tools', path, host)
  return (
    <>
      <JsonLd data={[personSchema, websiteSchema, toolsListSchema, toolsPageSchema]} />
      <main className="flex min-h-dvh flex-col bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
          {/* Header */}
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full border bg-muted/50 px-4 py-1.5">
                <Wrench className="mr-2 h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium">Developer Tools</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Free Online Tools
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                A collection of useful developer tools. All client-side operations run in your browser -
                your data stays private.
              </p>
            </div>
          </BlurFade>

        {/* Tools Grid */}
          <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
            {tools.map((tool, index) => (
              <BlurFade key={tool.path} delay={BLUR_FADE_DELAY * (index + 2)}>
                <Link href={getHref(tool.path)} className="block h-full">
                  <Card className="h-full transition-colors hover:border-cyan-500/50 hover:bg-muted/30">
                    <CardHeader>
                      <div className={`mb-2 ${tool.color}`}>
                        <tool.icon className="h-8 w-8" />
                      </div>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </BlurFade>
            ))}
          </div>
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
