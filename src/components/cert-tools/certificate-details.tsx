"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Building,
  Calendar,
  Globe,
  Hash,
  FileText,
  Copy,
  Check,
  Key,
} from "lucide-react"

// Normalized certificate data interface
export interface CertificateData {
  commonName: string
  subject: Record<string, string>
  issuer: Record<string, string>
  serialNumber: string
  validFrom: Date | string
  validTo: Date | string
  publicKeyAlgorithm?: string
  signatureAlgorithm?: string
  sans?: string[]
  fingerprint?: string
  sha256?: string
  pem?: string
  isWildcard?: boolean
  isPrecert?: boolean
  isCA?: boolean
}

interface CertificateDetailsProps {
  certificate: CertificateData
  showPem?: boolean
  className?: string
}

// Parse DN string like "CN=R13,O=Let's Encrypt,C=US" into object
export function parseDN(dn: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = dn.split(/,(?=\s*[A-Z]+=)/)
  for (const part of parts) {
    const match = part.trim().match(/^([A-Z]+)=(.+)$/)
    if (match) {
      result[match[1]] = match[2]
    }
  }
  return result
}

export function CertificateDetails({ certificate, showPem = true, className = "" }: CertificateDetailsProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  }

  const getExpiryStatus = () => {
    const now = new Date()
    const expiry = typeof certificate.validTo === "string" ? new Date(certificate.validTo) : certificate.validTo
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return {
      isExpired: expiry < now,
      isExpiringSoon: expiry >= now && expiry < thirtyDays,
    }
  }

  const { isExpired, isExpiringSoon } = getExpiryStatus()
  const isWildcard = certificate.isWildcard ?? certificate.commonName?.startsWith("*.")

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status & Badges */}
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
        {certificate.isPrecert && <Badge variant="secondary">Precertificate</Badge>}
        {certificate.isCA && <Badge variant="secondary">CA</Badge>}
        {certificate.publicKeyAlgorithm && (
          <Badge variant="secondary">{certificate.publicKeyAlgorithm}</Badge>
        )}
        {certificate.signatureAlgorithm && (
          <Badge variant="outline">{certificate.signatureAlgorithm}</Badge>
        )}
      </div>

      {/* Subject */}
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
            <p className="break-all font-mono text-sm">{certificate.commonName}</p>
          </div>
          {certificate.subject.O && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Organization (O)</p>
              <p className="font-mono text-sm">{certificate.subject.O}</p>
            </div>
          )}
          {certificate.subject.OU && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Organizational Unit (OU)</p>
              <p className="font-mono text-sm">{certificate.subject.OU}</p>
            </div>
          )}
          {(certificate.subject.L || certificate.subject.ST || certificate.subject.C) && (
            <div className="grid gap-3 sm:grid-cols-3">
              {certificate.subject.L && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Locality (L)</p>
                  <p className="font-mono text-sm">{certificate.subject.L}</p>
                </div>
              )}
              {certificate.subject.ST && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">State (ST)</p>
                  <p className="font-mono text-sm">{certificate.subject.ST}</p>
                </div>
              )}
              {certificate.subject.C && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Country (C)</p>
                  <p className="font-mono text-sm">{certificate.subject.C}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Alternative Names */}
      {certificate.sans && certificate.sans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-emerald-500" />
              Subject Alternative Names ({certificate.sans.length})
            </CardTitle>
            <CardDescription>DNS names and IPs covered by this certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {certificate.sans.map((name) => (
                <Badge key={name} variant="secondary" className="font-mono text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issuer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="h-5 w-5 text-violet-500" />
            Issuer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {certificate.issuer.CN && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Common Name (CN)</p>
              <p className="font-mono text-sm">{certificate.issuer.CN}</p>
            </div>
          )}
          {certificate.issuer.O && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Organization (O)</p>
              <p className="font-mono text-sm">{certificate.issuer.O}</p>
            </div>
          )}
          {certificate.issuer.C && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Country (C)</p>
              <p className="font-mono text-sm">{certificate.issuer.C}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validity */}
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
              <p className="font-mono text-sm">{formatDate(certificate.validFrom)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Not After</p>
              <p className="font-mono text-sm">{formatDate(certificate.validTo)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identifiers */}
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
                <p className="break-all font-mono text-xs">{certificate.serialNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleCopy(certificate.serialNumber, "serial")}
              >
                {copied === "serial" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          {(certificate.sha256 || certificate.fingerprint) && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {certificate.sha256 ? "SHA-256 Fingerprint" : "Fingerprint"}
                  </p>
                  <p className="break-all font-mono text-xs">
                    {certificate.sha256 || certificate.fingerprint}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleCopy(certificate.sha256 || certificate.fingerprint || "", "fingerprint")}
                >
                  {copied === "fingerprint" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PEM Certificate */}
      {showPem && certificate.pem && (
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
                onClick={() => handleCopy(certificate.pem || "", "pem")}
              >
                {copied === "pem" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === "pem" ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs">
              {certificate.pem}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
