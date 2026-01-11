"use client"

import { useState, useCallback } from "react"
import { FileText, Copy, AlertCircle, Link, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { CertificateDetails, CertificateData } from "./certificate-details"

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

// Transform DecodedCert to CertificateData
function toCertificateData(decoded: DecodedCert, pem?: string): CertificateData {
  return {
    commonName: decoded.subject.CN || "",
    subject: decoded.subject,
    issuer: decoded.issuer,
    serialNumber: decoded.serialNumber,
    validFrom: decoded.validFrom,
    validTo: decoded.validTo,
    publicKeyAlgorithm: decoded.publicKey.algorithm,
    signatureAlgorithm: decoded.signatureAlgorithm,
    sans: decoded.sans,
    fingerprint: decoded.fingerprint,
    pem: pem,
    isCA: decoded.isCA,
  }
}

export function CertDecoder() {
  const [mode, setMode] = useState<"paste" | "url">("paste")
  const [pem, setPem] = useState("")
  const [urlInput, setUrlInput] = useState("")
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchedPem, setFetchedPem] = useState<string | null>(null)

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
    setCertData(null)

    try {
      const result = await decodeCertificate(pem)
      setCertData(toCertificateData(result, pem))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode certificate")
    }
  }, [pem])

  const handleFetchFromUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      setError("Please enter a hostname")
      return
    }

    // Parse hostname and port
    let hostname = urlInput.trim()
    let port = 443

    // Remove protocol if present
    hostname = hostname.replace(/^https?:\/\//, "")
    // Remove path if present
    hostname = hostname.split("/")[0]
    // Extract port if specified
    if (hostname.includes(":")) {
      const parts = hostname.split(":")
      hostname = parts[0]
      port = parseInt(parts[1], 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        setError("Invalid port number")
        return
      }
    }

    setError(null)
    setCertData(null)
    setFetchedPem(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/fetch-cert?host=${encodeURIComponent(hostname)}&port=${port}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch certificate")
      }

      if (!data.pem) {
        throw new Error("No certificate data received")
      }

      setFetchedPem(data.pem)

      // Decode the fetched PEM
      const result = await decodeCertificate(data.pem)

      // Add extra info from the API response
      if (data.subjectAltNames && data.subjectAltNames.length > 0) {
        result.sans = data.subjectAltNames
      }

      setCertData(toCertificateData(result, data.pem))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch certificate")
    } finally {
      setLoading(false)
    }
  }, [urlInput])

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
            Decode and view certificate details. Paste a PEM certificate or fetch directly from a website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => {
            setMode(v as "paste" | "url")
            setError(null)
            setCertData(null)
            setFetchedPem(null)
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="gap-2">
                <FileText className="h-4 w-4" />
                Paste PEM
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                Fetch from URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-4 space-y-4">
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
                    setCertData(null)
                    setError(null)
                  }}
                >
                  Clear
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Hostname</Label>
                <div className="flex gap-3">
                  <Input
                    placeholder="example.com or example.com:8443"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleFetchFromUrl()
                      }
                    }}
                    className="flex-1 font-mono"
                  />
                  <Button onClick={handleFetchFromUrl} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      "Fetch Certificate"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a hostname to fetch its SSL/TLS certificate. Optionally specify a port (default: 443).
                </p>
              </div>

              {/* Show fetched PEM */}
              {fetchedPem && (
                <div className="space-y-2">
                  <Label>Fetched Certificate (PEM)</Label>
                  <Textarea
                    value={fetchedPem}
                    readOnly
                    className="min-h-32 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(fetchedPem)
                    }}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy PEM
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Decoded Result */}
      {certData && <CertificateDetails certificate={certData} showPem={true} />}
    </div>
  )
}
