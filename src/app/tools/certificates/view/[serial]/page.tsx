"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Shield, AlertCircle, ExternalLink } from "lucide-react"
import { CertificateDetails, CertificateData, parseDN } from "@/components/cert-tools/certificate-details"
import { detectValidationType } from "@/lib/certificate-utils"

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

export default function CertificateViewPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [certData, setCertData] = useState<CertificateData | null>(null)

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
        const cert = data.certificate

        // Parse subject and detect validation type from PEM
        const subject = parseDN(cert.subject)
        const validationType = cert.pem ? detectValidationType(cert.pem, subject) : undefined

        // Transform to normalized format
        const normalized: CertificateData = {
          commonName: cert.commonName,
          subject,
          issuer: parseDN(cert.issuer),
          serialNumber: cert.serialNumber,
          validFrom: cert.notBefore,
          validTo: cert.notAfter,
          publicKeyAlgorithm: cert.publicKeyAlgorithm,
          signatureAlgorithm: cert.signatureAlgorithm,
          sans: cert.dnsNames,
          sha256: cert.sha256,
          pem: cert.pem,
          isPrecert: cert.isPrecert,
          validationType,
        }

        setCertData(normalized)
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Back Button */}
        <BlurFade delay={BLUR_FADE_DELAY}>
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </BlurFade>

        {/* Header */}
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center justify-center rounded-full border bg-muted/50 px-4 py-1.5">
              <Shield className="mr-2 h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">Certificate Details</span>
            </div>
            {certData && (
              <h1 className="break-all font-mono text-xl font-bold tracking-tight sm:text-2xl">
                {certData.commonName}
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
        {certData && (
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <CertificateDetails certificate={certData} showPem={true} />

            {/* External Link */}
            <div className="mt-8 flex justify-center">
              <a
                href={`https://www.certkit.io/tools/ct-logs/certificate?serial=${certData.serialNumber}`}
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
        )}
      </div>
    </main>
  )
}
