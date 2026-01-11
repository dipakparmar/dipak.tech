"use client"

import { useCallback, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileKey, FileText, Key, Search, Shield } from "lucide-react"

import { CTLogsViewer } from "@/components/cert-tools/ct-logs-viewer"
import { CertDecoder } from "@/components/cert-tools/cert-decoder"
import { CSRGenerator } from "@/components/cert-tools/csr-generator"
import { KeyGenerator } from "@/components/cert-tools/key-generator"

const BLUR_FADE_DELAY = 0.04

const VALID_TOOLS = ["ct-logs", "decoder", "csr", "keygen"] as const
type ToolType = (typeof VALID_TOOLS)[number]

function CertificateToolsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTool = (searchParams.get("tool") as ToolType) || "ct-logs"
  const activeTool = VALID_TOOLS.includes(currentTool) ? currentTool : "ct-logs"

  // Read tool-specific params
  const domain = searchParams.get("domain") || ""

  // CSR params
  const csrParams = {
    cn: searchParams.get("cn") || undefined,
    o: searchParams.get("o") || undefined,
    ou: searchParams.get("ou") || undefined,
    l: searchParams.get("l") || undefined,
    st: searchParams.get("st") || undefined,
    c: searchParams.get("c") || undefined,
    keyType: searchParams.get("keyType") || undefined,
    keySize: searchParams.get("keySize") || undefined,
    san: searchParams.get("san") || undefined,
  }

  // Key generator params
  const keygenParams = {
    algorithm: searchParams.get("algorithm") || undefined,
    keySize: searchParams.get("keySize") || undefined,
    usage: searchParams.get("usage") || undefined,
  }

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "ct-logs") {
        params.delete("tool")
      } else {
        params.set("tool", value)
      }
      const query = params.toString()
      router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <>
      {/* Header */}
      <BlurFade delay={BLUR_FADE_DELAY}>
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full border bg-muted/50 px-4 py-1.5">
            <Shield className="mr-2 h-4 w-4 text-cyan-500" />
            <span className="text-sm font-medium">Certificate Tools</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            SSL/TLS Certificate Utilities
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Generate keys, create CSRs, decode certificates, and search certificate transparency logs.
            All cryptographic operations run client-side - your keys never leave your browser.
          </p>
        </div>
      </BlurFade>

      {/* Tools Tabs */}
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Tabs value={activeTool} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
            <TabsTrigger
              value="ct-logs"
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 data-[state=active]:border-cyan-500/50 data-[state=active]:bg-cyan-500/10"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">CT Logs</span>
              <span className="sm:hidden">CT</span>
            </TabsTrigger>
            <TabsTrigger
              value="decoder"
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 data-[state=active]:border-cyan-500/50 data-[state=active]:bg-cyan-500/10"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Decoder</span>
              <span className="sm:hidden">Decode</span>
            </TabsTrigger>
            <TabsTrigger
              value="csr"
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 data-[state=active]:border-cyan-500/50 data-[state=active]:bg-cyan-500/10"
            >
              <FileKey className="h-4 w-4" />
              <span className="hidden sm:inline">CSR Generator</span>
              <span className="sm:hidden">CSR</span>
            </TabsTrigger>
            <TabsTrigger
              value="keygen"
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 data-[state=active]:border-cyan-500/50 data-[state=active]:bg-cyan-500/10"
            >
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Key Generator</span>
              <span className="sm:hidden">Keys</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ct-logs" className="mt-0">
            <CTLogsViewer initialDomain={domain} />
          </TabsContent>

          <TabsContent value="decoder" className="mt-0">
            <CertDecoder />
          </TabsContent>

          <TabsContent value="csr" className="mt-0">
            <CSRGenerator initialValues={csrParams} />
          </TabsContent>

          <TabsContent value="keygen" className="mt-0">
            <KeyGenerator initialValues={keygenParams} />
          </TabsContent>
        </Tabs>
      </BlurFade>
    </>
  )
}

export function CertificateToolsTabs() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="text-center">
            <div className="mx-auto h-8 w-32 animate-pulse rounded-full bg-muted" />
            <div className="mx-auto mt-4 h-10 w-64 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-3 h-16 w-96 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      }
    >
      <CertificateToolsContent />
    </Suspense>
  )
}
