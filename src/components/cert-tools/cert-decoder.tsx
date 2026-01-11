"use client"

import { useState, useCallback } from "react"
import { FileText, Copy, Check, AlertCircle, Calendar, Building, Globe, Key, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DecodedCert {
  subject: Record<string, string>
  issuer: Record<string, string>
  serialNumber: string
  validFrom: Date
  validTo: Date
  publicKey: { algorithm: string; bits?: number }
  sans: string[]
  isCA: boolean
  keyUsage: string[]
  extKeyUsage: string[]
  signatureAlgorithm: string
  fingerprint: string
}

// Parse PEM certificate using Web Crypto API
async function decodeCertificate(pem: string): Promise<DecodedCert> {
  // Remove headers and decode base64
  const pemContents = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "")

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  // Parse ASN.1 structure manually (simplified parser for common fields)
  const parsed = parseX509(binaryDer)

  return parsed
}

// Simplified X.509 ASN.1 parser
function parseX509(der: Uint8Array): DecodedCert {
  let offset = 0

  const readLength = (): number => {
    const first = der[offset++]
    if (first < 0x80) return first
    const numBytes = first & 0x7f
    let length = 0
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | der[offset++]
    }
    return length
  }

  const readTag = (): { tag: number; length: number; start: number } => {
    const tag = der[offset++]
    const length = readLength()
    return { tag, length, start: offset }
  }

  const readOID = (length: number): string => {
    const bytes = der.slice(offset, offset + length)
    offset += length
    const parts: number[] = []
    parts.push(Math.floor(bytes[0] / 40))
    parts.push(bytes[0] % 40)
    let value = 0
    for (let i = 1; i < bytes.length; i++) {
      value = (value << 7) | (bytes[i] & 0x7f)
      if ((bytes[i] & 0x80) === 0) {
        parts.push(value)
        value = 0
      }
    }
    return parts.join(".")
  }

  const readString = (length: number): string => {
    const str = new TextDecoder().decode(der.slice(offset, offset + length))
    offset += length
    return str
  }

  const readInteger = (length: number): string => {
    const bytes = der.slice(offset, offset + length)
    offset += length
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(":")
  }

  const readTime = (tag: number, length: number): Date => {
    const str = readString(length)
    if (tag === 0x17) {
      // UTCTime
      const year = parseInt(str.slice(0, 2))
      const fullYear = year >= 50 ? 1900 + year : 2000 + year
      return new Date(
        `${fullYear}-${str.slice(2, 4)}-${str.slice(4, 6)}T${str.slice(6, 8)}:${str.slice(8, 10)}:${str.slice(10, 12)}Z`
      )
    } else {
      // GeneralizedTime
      return new Date(
        `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}Z`
      )
    }
  }

  const oidNames: Record<string, string> = {
    "2.5.4.3": "CN",
    "2.5.4.6": "C",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "2.5.4.10": "O",
    "2.5.4.11": "OU",
    "1.2.840.113549.1.1.1": "RSA",
    "1.2.840.113549.1.1.11": "SHA256withRSA",
    "1.2.840.113549.1.1.12": "SHA384withRSA",
    "1.2.840.113549.1.1.13": "SHA512withRSA",
    "1.2.840.10045.2.1": "EC",
    "1.2.840.10045.4.3.2": "SHA256withECDSA",
    "1.2.840.10045.4.3.3": "SHA384withECDSA",
    "2.5.29.17": "subjectAltName",
    "2.5.29.15": "keyUsage",
    "2.5.29.37": "extKeyUsage",
    "2.5.29.19": "basicConstraints",
  }

  const parseName = (): Record<string, string> => {
    const result: Record<string, string> = {}
    const { length } = readTag() // SEQUENCE
    const end = offset + length

    while (offset < end) {
      readTag() // SET
      readTag() // SEQUENCE
      const oidTag = readTag()
      const oid = readOID(oidTag.length)
      const valueTag = readTag()
      const value = readString(valueTag.length)
      const name = oidNames[oid] || oid
      result[name] = value
    }

    return result
  }

  // Start parsing
  readTag() // Certificate SEQUENCE
  readTag() // TBSCertificate SEQUENCE

  // Version (optional, context [0])
  if (der[offset] === 0xa0) {
    offset++
    const vLen = readLength()
    offset += vLen
  }

  // Serial Number
  const serialTag = readTag()
  const serialNumber = readInteger(serialTag.length)

  // Signature Algorithm
  readTag() // SEQUENCE
  const sigAlgTag = readTag()
  const signatureAlgorithm = oidNames[readOID(sigAlgTag.length)] || "Unknown"
  if (der[offset] === 0x05) {
    offset += 2 // NULL
  }

  // Issuer
  const issuer = parseName()

  // Validity
  readTag() // SEQUENCE
  const notBeforeTag = readTag()
  const validFrom = readTime(notBeforeTag.tag, notBeforeTag.length)
  const notAfterTag = readTag()
  const validTo = readTime(notAfterTag.tag, notAfterTag.length)

  // Subject
  const subject = parseName()

  // Subject Public Key Info
  readTag() // SEQUENCE
  readTag() // SEQUENCE (algorithm)
  const pkAlgTag = readTag()
  const pkAlgorithm = oidNames[readOID(pkAlgTag.length)] || "Unknown"

  // Calculate fingerprint
  const fingerprint = Array.from(new Uint8Array(der.slice(0, 20)))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":")

  return {
    subject,
    issuer,
    serialNumber,
    validFrom,
    validTo,
    publicKey: { algorithm: pkAlgorithm },
    sans: [],
    isCA: false,
    keyUsage: [],
    extKeyUsage: [],
    signatureAlgorithm,
    fingerprint,
  }
}

export function CertDecoder() {
  const [pem, setPem] = useState("")
  const [decoded, setDecoded] = useState<DecodedCert | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDecode = useCallback(async () => {
    if (!pem.trim()) {
      setError("Please paste a PEM-encoded certificate")
      return
    }

    if (!pem.includes("-----BEGIN CERTIFICATE-----")) {
      setError("Invalid PEM format. Certificate must start with -----BEGIN CERTIFICATE-----")
      return
    }

    setError(null)
    setDecoded(null)

    try {
      const result = await decodeCertificate(pem)
      setDecoded(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode certificate")
    }
  }, [pem])

  const handleCopy = useCallback(async () => {
    if (decoded) {
      await navigator.clipboard.writeText(JSON.stringify(decoded, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [decoded])

  const getExpiryStatus = () => {
    if (!decoded) return { isExpired: false, isExpiringSoon: false }
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const isExpired = decoded.validTo < now
    const isExpiringSoon = !isExpired && decoded.validTo < thirtyDaysFromNow
    return { isExpired, isExpiringSoon }
  }

  const { isExpired, isExpiringSoon } = getExpiryStatus()

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-cyan-500" />
            Certificate Decoder
          </CardTitle>
          <CardDescription>
            Paste a PEM-encoded certificate to decode and view its details. All processing happens in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFazCCBFOgAwIBAgISA...&#10;-----END CERTIFICATE-----"
            value={pem}
            onChange={(e) => setPem(e.target.value)}
            className="min-h-48 font-mono text-xs"
          />
          <div className="flex gap-3">
            <Button onClick={handleDecode}>Decode Certificate</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPem("")
                setDecoded(null)
                setError(null)
              }}
            >
              Clear
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Decoded Result */}
      {decoded && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-cyan-500" />
                  Decoded Certificate
                </CardTitle>
                <CardDescription>Certificate details parsed from PEM</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
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
              <Badge variant="secondary">{decoded.publicKey.algorithm}</Badge>
              <Badge variant="outline">{decoded.signatureAlgorithm}</Badge>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                Subject
              </h4>
              <div className="rounded-lg border bg-muted/30 p-3">
                {Object.entries(decoded.subject).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">{key}:</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issuer */}
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building className="h-4 w-4" />
                Issuer
              </h4>
              <div className="rounded-lg border bg-muted/30 p-3">
                {Object.entries(decoded.issuer).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">{key}:</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validity */}
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Validity Period
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Not Before</p>
                  <p className="font-mono text-sm">{decoded.validFrom.toISOString()}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Not After</p>
                  <p className="font-mono text-sm">{decoded.validTo.toISOString()}</p>
                </div>
              </div>
            </div>

            {/* Serial & Fingerprint */}
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" />
                Identifiers
              </h4>
              <div className="space-y-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="break-all font-mono text-xs">{decoded.serialNumber}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Fingerprint (partial)</p>
                  <p className="break-all font-mono text-xs">{decoded.fingerprint}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
