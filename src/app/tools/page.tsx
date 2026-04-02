import React from "react"
import { Apple, Globe, KeyRound, Mail, Network, Search, Shield, Terminal, Wrench } from "lucide-react"
import { GitHubIcon } from "@/components/icons"
import type { CollectionPage, ItemList, ListItem, WebSite, WithContext } from "schema-dts"
import { personReference, personSchema } from "@/lib/schema"

import { BlurFade } from "@/components/magicui/blur-fade"
import { JsonLd } from "@/components/seo/json-ld"
import Link from "next/link"
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
  icon: typeof Shield | React.FC<React.SVGProps<SVGSVGElement>>
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
    span: 2,
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
    span: 2,
    stat: "Client-side · ES256 signing via Web Crypto",
    tags: ["JWT", "ES256", "Sign in with Apple"],
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
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, index) => (
              <BlurFade key={tool.path} delay={BLUR_FADE_DELAY * (index + 2)} className={tool.span === 2 ? "sm:col-span-2 lg:col-span-2" : ""}>
                <Link
                  href={getHref(tool.path)}
                  className="group block h-full"
                >
                  <div
                    className={`relative h-full overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 ${tool.borderColor} ${tool.hoverBg} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10`}
                  >
                    {/* Top accent bar */}
                    <div
                      className={`absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${tool.color} bg-current`}
                      style={{ maskImage: "linear-gradient(90deg, black, transparent)" }}
                    />

                    {/* Icon */}
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${tool.iconBg}`}
                    >
                      <tool.icon className={`h-5 w-5 ${tool.color}`} />
                    </div>

                    {/* Title + Description */}
                    <h3 className="text-sm font-semibold">{tool.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {tool.description}
                    </p>

                    {/* Hover-expand details */}
                    <div className="grid max-h-0 grid-rows-[0fr] transition-all duration-300 group-hover:mt-3 group-hover:max-h-28 group-hover:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <div className="border-t border-border pt-3">
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {tool.stat.split("·")[0].trim()}
                            </span>
                            {tool.stat.includes("·") && (
                              <span> · {tool.stat.split("·").slice(1).join("·").trim()}</span>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tool.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${tool.tagBg}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
