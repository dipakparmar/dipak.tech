"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Shield,
  Building,
  Calendar,
  Globe,
  Hash,
  FileText,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react"

const BLUR_FADE_DELAY = 0.04

interface CertificateResponse {
  certificate: {
    sha256: string
    commonName: string
    subject: string
    issuer: string
    dnsNames: string[]
    serialNumber: string
    notBefore: string
    notAfter: string
    signatureAlgorithm: string
    publicKeyAlgorithm: string
    pem: string
    isPrecert: boolean
  }
}

// Parse DN string like "CN=R13,O=Let's Encrypt,C=US" into object
function parseDN(dn: string): Record<string, string> {
  const result: Record<string, string> = {}
  // Handle escaped commas and split properly
  const parts = dn.split(/,(?=\s*[A-Z]+=)/)
  for (const part of parts) {
    const match = part.trim().match(/^([A-Z]+)=(.+)$/)
    if (match) {
      result[match[1]] = match[2]
    }
  }
  return result
}

export default function CertificateViewPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cert, setCert] = useState<CertificateResponse["certificate"] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCertificate() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`https://ct.certkit.io/certificate/serial/${serial}`, {
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Certificate not found")
          }
          throw new Error("Failed to fetch certificate details")
        }

        const data: CertificateResponse = await response.json()
        setCert(data.certificate)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch certificate")
      } finally {
        setLoading(false)
      }
    }

    if (serial) {
      fetchCertificate()
    }
  }, [serial])

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  }

  const getExpiryStatus = () => {
    if (!cert) return { isExpired: false, isExpiringSoon: false }
    const now = new Date()
    const expiry = new Date(cert.notAfter)
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return {
      isExpired: expiry < now,
      isExpiringSoon: expiry >= now && expiry < thirtyDays,
    }
  }

  const { isExpired, isExpiringSoon } = getExpiryStatus()

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Back Button */}
        <BlurFade delay={BLUR_FADE_DELAY}>
          <Link href="/tools/certificates">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Certificate Tools
            </Button>
          </Link>
        </BlurFade>

        {/* Header */}
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center justify-center rounded-full border bg-muted/50 px-4 py-1.5">
              <Shield className="mr-2 h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">Certificate Details</span>
            </div>
            {cert && (
              <h1 className="break-all font-mono text-xl font-bold tracking-tight sm:text-2xl">
                {cert.commonName}
              </h1>
            )}
          </div>
        </BlurFade>

        {/* Loading State */}
        {loading && (
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="mb-4 h-8 w-64" />
                  <Skeleton className="mb-2 h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="mb-4 h-6 w-32" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </BlurFade>
        )}

        {/* Error State */}
        {error && (
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </BlurFade>
        )}

        {/* Certificate Details */}
        {cert && (() => {
          const subject = parseDN(cert.subject)
          const issuer = parseDN(cert.issuer)
          const isWildcard = cert.commonName.startsWith("*.")

          return (
            <div className="space-y-6">
              {/* Status & Badges */}
              <BlurFade delay={BLUR_FADE_DELAY * 3}>
                <div className="flex flex-wrap gap-2">
                  {isExpired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : isExpiringSoon ? (
                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                      Expiring Soon
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-emerald-500">
                      Valid
                    </Badge>
                  )}
                  {isWildcard && <Badge variant="outline">Wildcard</Badge>}
                  {cert.isPrecert && <Badge variant="secondary">Precertificate</Badge>}
                  {cert.publicKeyAlgorithm && (
                    <Badge variant="secondary">{cert.publicKeyAlgorithm}</Badge>
                  )}
                  {cert.signatureAlgorithm && <Badge variant="outline">{cert.signatureAlgorithm}</Badge>}
                </div>
              </BlurFade>

              {/* Subject */}
              <BlurFade delay={BLUR_FADE_DELAY * 4}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-5 w-5 text-cyan-500" />
                      Subject
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Common Name (CN)</p>
                      <p className="break-all font-mono text-sm">{cert.commonName}</p>
                    </div>
                    {subject.O && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Organization (O)</p>
                        <p className="font-mono text-sm">{subject.O}</p>
                      </div>
                    )}
                    {(subject.L || subject.ST || subject.C) && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {subject.L && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Locality (L)</p>
                            <p className="font-mono text-sm">{subject.L}</p>
                          </div>
                        )}
                        {subject.ST && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">State (ST)</p>
                            <p className="font-mono text-sm">{subject.ST}</p>
                          </div>
                        )}
                        {subject.C && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">Country (C)</p>
                            <p className="font-mono text-sm">{subject.C}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </BlurFade>

              {/* DNS Names / SANs */}
              {cert.dnsNames && cert.dnsNames.length > 0 && (
                <BlurFade delay={BLUR_FADE_DELAY * 5}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-emerald-500" />
                        Subject Alternative Names ({cert.dnsNames.length})
                      </CardTitle>
                      <CardDescription>DNS names covered by this certificate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {cert.dnsNames.map((name) => (
                          <Badge key={name} variant="secondary" className="font-mono text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </BlurFade>
              )}

              {/* Issuer */}
              <BlurFade delay={BLUR_FADE_DELAY * 6}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building className="h-5 w-5 text-violet-500" />
                      Issuer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {issuer.CN && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Common Name (CN)</p>
                        <p className="font-mono text-sm">{issuer.CN}</p>
                      </div>
                    )}
                    {issuer.O && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Organization (O)</p>
                        <p className="font-mono text-sm">{issuer.O}</p>
                      </div>
                    )}
                    {issuer.C && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Country (C)</p>
                        <p className="font-mono text-sm">{issuer.C}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </BlurFade>

              {/* Validity */}
              <BlurFade delay={BLUR_FADE_DELAY * 7}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      Validity Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground">Not Before</p>
                        <p className="font-mono text-sm">{formatDate(cert.notBefore)}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground">Not After</p>
                        <p className="font-mono text-sm">{formatDate(cert.notAfter)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </BlurFade>

              {/* Fingerprints & Serial */}
              <BlurFade delay={BLUR_FADE_DELAY * 8}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Hash className="h-5 w-5 text-rose-500" />
                      Identifiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">Serial Number</p>
                          <p className="break-all font-mono text-xs">{cert.serialNumber}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleCopy(cert.serialNumber, "serial")}
                        >
                          {copied === "serial" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {cert.sha256 && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">SHA-256 Fingerprint</p>
                            <p className="break-all font-mono text-xs">{cert.sha256}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleCopy(cert.sha256, "sha256")}
                          >
                            {copied === "sha256" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </BlurFade>

              {/* PEM Certificate */}
              {cert.pem && (
                <BlurFade delay={BLUR_FADE_DELAY * 9}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-cyan-500" />
                            PEM Certificate
                          </CardTitle>
                          <CardDescription>Raw certificate in PEM format</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleCopy(cert.pem, "pem")}
                        >
                          {copied === "pem" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied === "pem" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs">
                        {cert.pem}
                      </pre>
                    </CardContent>
                  </Card>
                </BlurFade>
              )}

              {/* External Link */}
              <BlurFade delay={BLUR_FADE_DELAY * 10}>
                <div className="flex justify-center pt-4">
                  <a
                    href={`https://www.certkit.io/certificate/serial/${cert.serialNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on CertKit.io
                    </Button>
                  </a>
                </div>
              </BlurFade>
            </div>
          )
        })()}
      </div>
    </main>
  )
}
