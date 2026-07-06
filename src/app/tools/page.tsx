import React from "react"
import { Apple, CalendarHeart, Globe, KeyRound, Mail, Music2, Network, Search, Shield, Terminal, Wrench } from "lucide-react"
import { GitHubIcon } from "@/components/icons"
import type { CollectionPage, ItemList, ListItem, WebSite, WithContext } from "schema-dts"
import { personReference, personSchema } from "@/lib/schema"

import { BlurFade } from "@/components/magicui/blur-fade"
import { JsonLd } from "@/components/seo/json-ld"
import Link from "next/link"
import { ToolCard } from "@/components/tool-card"
import { buildHref } from "@/lib/host-routing"
import { headers } from "next/headers"
import { ogUrls } from "@/lib/og-config"

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

type Tool = {
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

const tools: Tool[] = [
  {
    title: "Certificate Tools",
    description: "Search CT logs, decode certificates, generate CSRs and key pairs",
    path: "certificates",
    icon: Shield,
    color: "text-cyan-500",
    borderColor: "hover:border-cyan-500/30",
    iconBg: "bg-cyan-500/10",
    tagBg: "bg-cyan-500/10 text-cyan-500",
    hoverBg: "hover:bg-cyan-500/10",
    span: 2,
    stat: "4 tools · All client-side",
    tags: ["CT Log Search", "Decoder", "CSR Generator", "Key Generator"],
  },
  {
    title: "WHOIS Lookup",
    description: "Domain, IP, and ASN registration lookup via RDAP protocol",
    path: "whois",
    icon: Search,
    color: "text-amber-500",
    borderColor: "hover:border-amber-500/30",
    iconBg: "bg-amber-500/10",
    tagBg: "bg-amber-500/10 text-amber-500",
    hoverBg: "hover:bg-amber-500/10",
    stat: "RDAP protocol · Server-side lookup",
    tags: ["Domain", "IP", "ASN"],
  },
  {
    title: "OSINT Scanner",
    description: "DNS records, IP geolocation, and domain intelligence",
    path: "osint",
    icon: Globe,
    color: "text-emerald-500",
    borderColor: "hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/10",
    tagBg: "bg-emerald-500/10 text-emerald-500",
    hoverBg: "hover:bg-emerald-500/10",
    stat: "Multi-source · DNS, HTTP, TLS, IP",
    tags: ["DNS Map", "Subdomains", "Headers"],
  },
  {
    title: "IP & Network Intelligence",
    description: "IP geolocation, ASN lookup, BGP routing, RDAP network blocks",
    path: "ip",
    icon: Network,
    color: "text-blue-500",
    borderColor: "hover:border-blue-500/30",
    iconBg: "bg-blue-500/10",
    tagBg: "bg-blue-500/10 text-blue-500",
    hoverBg: "hover:bg-blue-500/10",
    stat: "Smart input · Accepts IP, ASN, CIDR, URLs",
    tags: ["Geolocation", "BGP Routing", "AS Path Graph", "RDAP"],
  },
  {
    title: "Password Generator",
    description: "Generate secure passwords, passphrases, PINs, salts, and API keys",
    path: "password-generator",
    icon: KeyRound,
    color: "text-indigo-500",
    borderColor: "hover:border-indigo-500/30",
    iconBg: "bg-indigo-500/10",
    tagBg: "bg-indigo-500/10 text-indigo-500",
    hoverBg: "hover:bg-indigo-500/10",
    stat: "Client-side · Web Crypto API",
    tags: ["Password", "Passphrase", "PIN"],
  },
  {
    title: "Release Notes",
    description: "Combine GitHub releases into a single, exportable changelog",
    path: "github-release-notes",
    icon: GitHubIcon,
    color: "text-slate-600 dark:text-slate-300",
    borderColor: "hover:border-slate-500/30",
    iconBg: "bg-slate-500/10",
    tagBg: "bg-slate-500/10 text-slate-400",
    hoverBg: "hover:bg-slate-500/10",
    stat: "GitHub API · Export as Markdown",
    tags: ["Changelog", "Export"],
  },
  {
    title: "Message Header Analyzer",
    description: "Parse and analyze email headers, routing hops, and authentication",
    path: "message-header-analyzer",
    icon: Mail,
    color: "text-orange-500",
    borderColor: "hover:border-orange-500/30",
    iconBg: "bg-orange-500/10",
    tagBg: "bg-orange-500/10 text-orange-500",
    hoverBg: "hover:bg-orange-500/10",
    stat: "Client-side · Paste & analyze",
    tags: ["SPF", "DKIM", "DMARC"],
  },
  {
    title: "Web Terminal",
    description: "Browser-based terminal for Serial, WebSocket, SSH, and Telnet",
    path: "web-terminal",
    icon: Terminal,
    color: "text-violet-500",
    borderColor: "hover:border-violet-500/30",
    iconBg: "bg-violet-500/10",
    tagBg: "bg-violet-500/10 text-violet-500",
    hoverBg: "hover:bg-violet-500/10",
    stat: "Browser-based · Multiple protocols",
    tags: ["Serial", "WebSocket", "SSH"],
  },
  {
    title: "Apple Client Secret Generator",
    description: "Generate ES256-signed JWTs for Sign in with Apple authentication",
    path: "apple-secret-generator",
    icon: Apple,
    color: "text-rose-500",
    borderColor: "hover:border-rose-500/30",
    iconBg: "bg-rose-500/10",
    tagBg: "bg-rose-500/10 text-rose-500",
    hoverBg: "hover:bg-rose-500/10",
    stat: "Client-side · ES256 signing via Web Crypto",
    tags: ["JWT", "ES256", "Sign in with Apple"],
  },
  {
    title: "Music & Audio Tools",
    description: "Browser-based music tools - 8D audio maker with Smart automation, and more on the way",
    path: "music",
    icon: Music2,
    color: "text-sky-500",
    borderColor: "hover:border-sky-500/30",
    iconBg: "bg-sky-500/10",
    tagBg: "bg-sky-500/10 text-sky-500",
    hoverBg: "hover:bg-sky-500/10",
    stat: "Client-side · 8D maker + more coming",
    tags: ["8D Audio", "Smart 8D", "Timeline", "More soon"],
  },
  {
    title: "Time-off Optimizer",
    description: "Maximize your PTO by stacking days off around weekends, holidays, and company days",
    path: "timeoff-optimizer",
    icon: CalendarHeart,
    color: "text-pink-500",
    borderColor: "hover:border-pink-500/30",
    iconBg: "bg-pink-500/10",
    tagBg: "bg-pink-500/10 text-pink-500",
    hoverBg: "hover:bg-pink-500/10",
    stat: "Client-side · 5 strategies, 200+ countries",
    tags: ["PTO", "Holidays", "ICS Export"],
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
                A collection of useful developer tools. Client-side tools run entirely in your browser.
                Network lookups are proxied through our server — no data is stored.
              </p>
            </div>
          </BlurFade>

          {/* Bento Grid */}
          <div className="mx-auto grid max-w-3xl grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, index) => (
              <BlurFade key={tool.path} delay={BLUR_FADE_DELAY * (index + 2)} className={tool.span === 2 ? "sm:col-span-2 lg:col-span-2" : ""}>
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
