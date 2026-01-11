import Link from "next/link"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Globe, Search, Wrench } from "lucide-react"

export const metadata = {
  title: "Developer Tools | Dipak Parmar",
  description: "Free online developer tools - SSL certificate utilities, OSINT scanner, WHOIS lookup, and more.",
}

const BLUR_FADE_DELAY = 0.04

const tools = [
  {
    title: "Certificate Tools",
    description: "Search CT logs, decode certificates, generate CSRs and key pairs",
    href: "/tools/certificates",
    icon: Shield,
    color: "text-cyan-500",
  },
  {
    title: "OSINT Scanner",
    description: "DNS record scanning, IP geolocation, and domain intelligence",
    href: "/tools/osint",
    icon: Globe,
    color: "text-emerald-500",
  },
  {
    title: "WHOIS Lookup",
    description: "Domain registration information and ownership details",
    href: "/tools/whois",
    icon: Search,
    color: "text-violet-500",
  },
]

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-background">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <BlurFade key={tool.href} delay={BLUR_FADE_DELAY * (index + 2)}>
              <Link href={tool.href} className="block h-full">
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
    </main>
  )
}
