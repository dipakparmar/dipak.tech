import Link from "next/link"
import { headers } from "next/headers"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Globe, Wrench } from "lucide-react"

export const metadata = {
  title: "Developer Tools | Dipak Parmar",
  description: "Free online developer tools - SSL certificate utilities, OSINT scanner, and more.",
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
    title: "OSINT Scanner",
    description: "WHOIS lookup, DNS records, IP geolocation, and domain intelligence",
    path: "osint",
    icon: Globe,
    color: "text-emerald-500",
  },
]

export default async function ToolsPage() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const isToolsDomain = host.includes("tools.dipak.io")

  // On tools.dipak.io, use /path; on other domains, use /tools/path
  const getHref = (path: string) => isToolsDomain ? `/${path}` : `/tools/${path}`
  return (
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
  )
}
