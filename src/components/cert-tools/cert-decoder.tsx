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
  validationType: "DV" | "OV" | "EV"
  policyOIDs: string[]
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

// Known EV (Extended Validation) policy OIDs
const EV_POLICY_OIDS = new Set([
  "2.23.140.1.1", // CA/Browser Forum EV
  "2.16.840.1.114412.2.1", // DigiCert EV
  "2.16.840.1.114412.1.3.0.2", // DigiCert EV
  "1.3.6.1.4.1.34697.2.1", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.2", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.3", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.4", // AffirmTrust EV
  "2.16.840.1.114028.10.1.2", // Entrust EV
  "1.3.6.1.4.1.6449.1.2.1.5.1", // Sectigo/Comodo EV
  "2.16.840.1.114414.1.7.23.3", // Starfield EV
  "2.16.840.1.114413.1.7.23.3", // GoDaddy EV
  "1.3.6.1.4.1.8024.0.2.100.1.2", // QuoVadis EV
  "2.16.756.1.89.1.2.1.1", // SwissSign EV
  "1.3.6.1.4.1.14370.1.6", // GeoTrust EV
  "2.16.840.1.113733.1.7.48.1", // VeriSign/Symantec EV
  "2.16.840.1.114404.1.1.2.4.1", // Trustwave EV
  "1.3.6.1.4.1.4146.1.1", // GlobalSign EV
  "2.16.578.1.26.1.3.3", // Buypass EV
  "1.3.6.1.4.1.17326.10.14.2.1.2", // Camerfirma EV
  "1.3.6.1.4.1.17326.10.8.12.1.2", // Camerfirma EV
  "1.3.6.1.4.1.22234.2.5.2.3.1", // Keynectis EV
  "1.3.6.1.4.1.782.1.2.1.8.1", // Network Solutions EV
  "1.3.6.1.4.1.6334.1.100.1", // Cybertrust EV
  "2.16.840.1.114171.500.9", // Wells Fargo EV
  "1.3.6.1.4.1.13177.10.1.3.10", // Finmeccanica EV
  "2.16.792.3.0.4.1.1.4", // E-Tugra EV
  "2.16.840.1.114028.10.1.2", // Entrust EV
  "1.3.6.1.4.1.40869.1.1.22.3", // TWCA EV
  "1.3.6.1.4.1.23223.1.1.1", // StartCom EV
  "2.16.840.1.114414.1.7.24.3", // Starfield EV
  "2.16.840.1.114413.1.7.24.3", // GoDaddy EV
])

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

  // Subject Public Key Info - skip the entire SEQUENCE
  const spkiTag = readTag() // SEQUENCE
  offset += spkiTag.length

  // Parse extensions if present
  const policyOIDs: string[] = []
  const sans: string[] = []
  let isCA = false

  // Look for extensions (context tag [3])
  // Skip optional issuerUniqueID [1] and subjectUniqueID [2]
  while (offset < der.length) {
    if (der[offset] === 0xa3) {
      // Extensions [3]
      offset++
      const extOuterLen = readLength()
      const extEnd = offset + extOuterLen

      // Extensions SEQUENCE
      if (der[offset] === 0x30) {
        readTag() // SEQUENCE

        while (offset < extEnd && offset < der.length) {
          if (der[offset] !== 0x30) break

          const extSeqTag = readTag() // Extension SEQUENCE
          const extSeqEnd = offset + extSeqTag.length

          if (der[offset] !== 0x06) {
            offset = extSeqEnd
            continue
          }

          const extOidTag = readTag()
          const extOid = readOID(extOidTag.length)

          // Certificate Policies (2.5.29.32)
          if (extOid === "2.5.29.32") {
            // Skip critical flag if present
            if (der[offset] === 0x01) {
              offset += 3
            }
            // OCTET STRING wrapper
            if (der[offset] === 0x04) {
              readTag()
              // certificatePolicies SEQUENCE
              if (der[offset] === 0x30) {
                const policiesTag = readTag()
                const policiesEnd = offset + policiesTag.length

                while (offset < policiesEnd && offset < der.length) {
                  if (der[offset] !== 0x30) break
                  const policyTag = readTag() // PolicyInformation SEQUENCE
                  const policyEnd = offset + policyTag.length

                  if (der[offset] === 0x06) {
                    const policyOidTag = readTag()
                    const policyOid = readOID(policyOidTag.length)
                    policyOIDs.push(policyOid)
                  }

                  offset = policyEnd
                }
              }
            }
          }
          // Subject Alternative Name (2.5.29.17)
          else if (extOid === "2.5.29.17") {
            // Skip critical flag if present
            if (der[offset] === 0x01) {
              offset += 3
            }
            // OCTET STRING wrapper
            if (der[offset] === 0x04) {
              readTag()
              // GeneralNames SEQUENCE
              if (der[offset] === 0x30) {
                const sanSeqTag = readTag()
                const sanEnd = offset + sanSeqTag.length

                while (offset < sanEnd && offset < der.length) {
                  const sanType = der[offset]
                  offset++
                  const sanLen = readLength()

                  // DNS name (type 2) or IP (type 7)
                  if ((sanType & 0x1f) === 2) {
                    sans.push(new TextDecoder().decode(der.slice(offset, offset + sanLen)))
                  }
                  offset += sanLen
                }
              }
            }
          }
          // Basic Constraints (2.5.29.19)
          else if (extOid === "2.5.29.19") {
            // Skip critical flag if present
            if (der[offset] === 0x01) {
              offset += 3
            }
            // OCTET STRING wrapper
            if (der[offset] === 0x04) {
              readTag()
              // BasicConstraints SEQUENCE
              if (der[offset] === 0x30) {
                const bcTag = readTag()
                const bcEnd = offset + bcTag.length
                // Check for cA BOOLEAN TRUE
                if (offset < bcEnd && der[offset] === 0x01 && der[offset + 1] === 0x01 && der[offset + 2] === 0xff) {
                  isCA = true
                }
              }
            }
          }

          offset = extSeqEnd
        }
      }
      break
    } else if (der[offset] === 0xa1 || der[offset] === 0xa2) {
      // Skip issuerUniqueID or subjectUniqueID
      offset++
      const skipLen = readLength()
      offset += skipLen
    } else {
      break
    }
  }

  // Determine validation type
  const hasEVPolicy = policyOIDs.some((oid) => EV_POLICY_OIDS.has(oid))
  const hasOrganization = !!subject.O

  let validationType: "DV" | "OV" | "EV" = "DV"
  if (hasEVPolicy) {
    validationType = "EV"
  } else if (hasOrganization) {
    validationType = "OV"
  }

  // Calculate fingerprint
  const fingerprint = Array.from(new Uint8Array(der.slice(0, 20)))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":")

  // Get public key algorithm from SPKI (simplified - just report what we found earlier)
  const pkAlgorithm = signatureAlgorithm.includes("RSA") ? "RSA" :
                      signatureAlgorithm.includes("EC") ? "EC" : "Unknown"

  return {
    subject,
    issuer,
    serialNumber,
    validFrom,
    validTo,
    publicKey: { algorithm: pkAlgorithm },
    sans,
    isCA,
    keyUsage: [],
    extKeyUsage: [],
    signatureAlgorithm,
    fingerprint,
    validationType,
    policyOIDs,
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
    validationType: decoded.validationType,
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

      // Use validationType from API if available (more reliable server-side parsing)
      if (data.validationType) {
        result.validationType = data.validationType
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
