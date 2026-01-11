"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { FileKey, Copy, Check, Download, AlertCircle, Shield, Share2, Plus, X, Key, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as pkijs from "pkijs"
import * as asn1js from "asn1js"

interface CSRResult {
  csr: string
  privateKey: string
  algorithm: string
  keySize: string
  sans: string[]
}

// Format PEM with line breaks
function formatPEM(base64: string, type: string): string {
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Parse PEM to get the base64 content
function parsePEM(pem: string): { type: string; data: ArrayBuffer } | null {
  const match = pem.match(/-----BEGIN ([A-Z0-9 ]+)-----\s*([\s\S]+?)\s*-----END \1-----/)
  if (!match) return null
  const type = match[1]
  const base64 = match[2].replace(/\s/g, "")
  return { type, data: base64ToArrayBuffer(base64) }
}

// Validate domain name
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false
  // Allow wildcards like *.example.com
  const domainPattern = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/
  return domainPattern.test(domain)
}

// Validate email address
function isValidEmail(email: string): boolean {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailPattern.test(email)
}

// Validate IPv4 address
function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".")
  if (parts.length !== 4) return false
  return parts.every((part) => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString()
  })
}

// Validate IPv6 address
function isValidIPv6(ip: string): boolean {
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:(:([0-9a-fA-F]{1,4})){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}$/
  return ipv6Pattern.test(ip)
}

// Detect SAN type and validate
function getSanType(value: string): { type: "dns" | "email" | "ip"; valid: boolean } {
  if (isValidEmail(value)) return { type: "email", valid: true }
  if (isValidIPv4(value) || isValidIPv6(value)) return { type: "ip", valid: true }
  if (isValidDomain(value)) return { type: "dns", valid: true }
  return { type: "dns", valid: false }
}

// Validate country code (2 letters)
function isValidCountryCode(code: string): boolean {
  if (!code) return true // Optional field
  return /^[A-Z]{2}$/.test(code)
}

// Convert IP address to bytes for ASN.1 encoding
function ipToBytes(ip: string): Uint8Array {
  if (isValidIPv4(ip)) {
    return new Uint8Array(ip.split(".").map((p) => parseInt(p, 10)))
  }
  // IPv6
  const parts = ip.split(":")
  const bytes = new Uint8Array(16)
  let byteIndex = 0
  for (const part of parts) {
    if (part === "") continue
    const num = parseInt(part, 16)
    bytes[byteIndex++] = (num >> 8) & 0xff
    bytes[byteIndex++] = num & 0xff
  }
  return bytes
}

interface CSRGeneratorProps {
  initialValues?: {
    cn?: string
    o?: string
    ou?: string
    l?: string
    st?: string
    c?: string
    keyType?: string
    keySize?: string
    san?: string // comma-separated SANs
  }
}

export function CSRGenerator({ initialValues }: CSRGeneratorProps) {
  const pathname = usePathname()
  const [keyMode, setKeyMode] = useState<"generate" | "existing">("generate")
  const [existingKey, setExistingKey] = useState("")
  const [formData, setFormData] = useState({
    commonName: initialValues?.cn || "",
    organization: initialValues?.o || "",
    organizationalUnit: initialValues?.ou || "",
    locality: initialValues?.l || "",
    state: initialValues?.st || "",
    country: initialValues?.c || "",
    keyType: initialValues?.keyType || "RSA",
    keySize: initialValues?.keySize || "2048",
  })
  const [sans, setSans] = useState<string[]>(
    initialValues?.san ? initialValues.san.split(",").map((s) => s.trim()).filter(Boolean) : []
  )
  const [sanInput, setSanInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CSRResult | null>(null)
  const [copied, setCopied] = useState<"csr" | "key" | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  const [sanError, setSanError] = useState<string | null>(null)

  const handleAddSan = useCallback(() => {
    const trimmed = sanInput.trim()
    if (!trimmed) {
      setSanError("Please enter a value")
      return
    }
    const sanCheck = getSanType(trimmed)
    if (!sanCheck.valid) {
      setSanError("Invalid format. Enter a domain (example.com), email (user@example.com), or IP address (192.168.1.1)")
      return
    }
    if (sans.includes(trimmed)) {
      setSanError("This value is already in the list")
      return
    }
    setSans((prev) => [...prev, trimmed])
    setSanInput("")
    setSanError(null)
  }, [sanInput, sans])

  const handleRemoveSan = useCallback((san: string) => {
    setSans((prev) => prev.filter((s) => s !== san))
  }, [])

  const handleShareUrl = useCallback(async () => {
    const params = new URLSearchParams()
    params.set("tool", "csr")
    if (formData.commonName) params.set("cn", formData.commonName)
    if (formData.organization) params.set("o", formData.organization)
    if (formData.organizationalUnit) params.set("ou", formData.organizationalUnit)
    if (formData.locality) params.set("l", formData.locality)
    if (formData.state) params.set("st", formData.state)
    if (formData.country) params.set("c", formData.country)
    if (formData.keyType !== "RSA") params.set("keyType", formData.keyType)
    if (formData.keySize !== "2048") params.set("keySize", formData.keySize)
    if (sans.length > 0) params.set("san", sans.join(","))
    const url = `${window.location.origin}${pathname}?${params.toString()}`
    await navigator.clipboard.writeText(url)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }, [formData, sans, pathname])

  const handleGenerate = useCallback(async () => {
    if (!formData.commonName.trim()) {
      setError("Common Name (domain) is required")
      return
    }

    if (!isValidDomain(formData.commonName.trim())) {
      setError("Common Name must be a valid domain (e.g., example.com or *.example.com)")
      return
    }

    if (formData.country && !isValidCountryCode(formData.country)) {
      setError("Country must be a 2-letter code (e.g., US, GB, CA)")
      return
    }

    // Validate all SANs
    for (const san of sans) {
      const sanCheck = getSanType(san)
      if (!sanCheck.valid) {
        setError(`Invalid SAN: "${san}" is not a valid domain, email, or IP address`)
        return
      }
    }

    if (keyMode === "existing" && !existingKey.trim()) {
      setError("Please paste your private key")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Set up crypto engine
      const crypto = pkijs.getCrypto(true)

      let privateKey: CryptoKey
      let publicKey: CryptoKey
      let detectedKeyType = formData.keyType
      let detectedKeySize = formData.keySize

      if (keyMode === "existing") {
        // Parse and import existing key
        const parsed = parsePEM(existingKey.trim())
        if (!parsed) {
          throw new Error("Invalid PEM format. Please paste a valid private key.")
        }

        if (parsed.type !== "PRIVATE KEY" && parsed.type !== "RSA PRIVATE KEY" && parsed.type !== "EC PRIVATE KEY") {
          throw new Error(`Expected a private key, but got: ${parsed.type}`)
        }

        // Try to import as RSA first, then EC
        let importedKey: CryptoKey | null = null
        let keyAlgorithm: RsaHashedImportParams | EcKeyImportParams | null = null

        // Try RSA
        for (const modulusLength of [2048, 3072, 4096]) {
          try {
            keyAlgorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
            importedKey = await crypto.importKey("pkcs8", parsed.data, keyAlgorithm, true, ["sign"])
            detectedKeyType = "RSA"
            detectedKeySize = modulusLength.toString()
            break
          } catch {
            // Try next
          }
        }

        // Try EC if RSA failed
        if (!importedKey) {
          for (const curve of ["P-256", "P-384", "P-521"] as const) {
            try {
              keyAlgorithm = { name: "ECDSA", namedCurve: curve }
              importedKey = await crypto.importKey("pkcs8", parsed.data, keyAlgorithm, true, ["sign"])
              detectedKeyType = "EC"
              detectedKeySize = curve === "P-256" ? "256" : curve === "P-384" ? "384" : "521"
              break
            } catch {
              // Try next
            }
          }
        }

        if (!importedKey) {
          throw new Error("Could not import private key. Ensure it's a valid RSA or EC private key in PKCS#8 format.")
        }

        privateKey = importedKey

        // Derive public key from private key by exporting as JWK and removing private components
        const jwk = await crypto.exportKey("jwk", privateKey)
        // Remove private key components for public key
        const publicJwk = { ...jwk }
        delete publicJwk.d // Private exponent
        delete publicJwk.p // RSA prime p
        delete publicJwk.q // RSA prime q
        delete publicJwk.dp // RSA exponent1
        delete publicJwk.dq // RSA exponent2
        delete publicJwk.qi // RSA coefficient
        publicJwk.key_ops = ["verify"]

        const publicKeyAlgorithm = detectedKeyType === "RSA"
          ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
          : { name: "ECDSA", namedCurve: detectedKeySize === "256" ? "P-256" : detectedKeySize === "384" ? "P-384" : "P-521" }

        publicKey = await crypto.importKey("jwk", publicJwk, publicKeyAlgorithm, true, ["verify"])
      } else {
        // Generate new key pair
        const isRSA = formData.keyType === "RSA"
        const algorithm = isRSA
          ? {
              name: "RSASSA-PKCS1-v1_5",
              modulusLength: parseInt(formData.keySize),
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: { name: "SHA-256" },
            }
          : {
              name: "ECDSA",
              namedCurve: formData.keySize === "256" ? "P-256" : "P-384",
            }

        const keyPair = await crypto.generateKey(algorithm, true, ["sign", "verify"])
        privateKey = keyPair.privateKey
        publicKey = keyPair.publicKey
        detectedKeyType = formData.keyType
        detectedKeySize = formData.keySize
      }

      // Create PKCS#10 CSR
      const pkcs10 = new pkijs.CertificationRequest()

      // Set version
      pkcs10.version = 0

      // Build subject
      const subjectTypesAndValues: pkijs.AttributeTypeAndValue[] = []

      if (formData.country) {
        subjectTypesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: "2.5.4.6", // Country
            value: new asn1js.PrintableString({ value: formData.country }),
          })
        )
      }
      if (formData.state) {
        subjectTypesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: "2.5.4.8", // State
            value: new asn1js.Utf8String({ value: formData.state }),
          })
        )
      }
      if (formData.locality) {
        subjectTypesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: "2.5.4.7", // Locality
            value: new asn1js.Utf8String({ value: formData.locality }),
          })
        )
      }
      if (formData.organization) {
        subjectTypesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: "2.5.4.10", // Organization
            value: new asn1js.Utf8String({ value: formData.organization }),
          })
        )
      }
      if (formData.organizationalUnit) {
        subjectTypesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: "2.5.4.11", // Organizational Unit
            value: new asn1js.Utf8String({ value: formData.organizationalUnit }),
          })
        )
      }
      subjectTypesAndValues.push(
        new pkijs.AttributeTypeAndValue({
          type: "2.5.4.3", // Common Name
          value: new asn1js.Utf8String({ value: formData.commonName }),
        })
      )

      pkcs10.subject.typesAndValues = subjectTypesAndValues

      // Add Subject Alternative Names if provided
      const allSans = [formData.commonName, ...sans]
      const uniqueSans = [...new Set(allSans)]

      if (uniqueSans.length > 0) {
        const altNames = new pkijs.GeneralNames({
          names: uniqueSans.map((name) => {
            const sanType = getSanType(name)
            if (sanType.type === "email") {
              // rfc822Name (email)
              return new pkijs.GeneralName({
                type: 1,
                value: name,
              })
            } else if (sanType.type === "ip") {
              // iPAddress
              return new pkijs.GeneralName({
                type: 7,
                value: new asn1js.OctetString({ valueHex: ipToBytes(name) }),
              })
            } else {
              // dNSName (domain)
              return new pkijs.GeneralName({
                type: 2,
                value: name,
              })
            }
          }),
        })

        const sanExtension = new pkijs.Extension({
          extnID: "2.5.29.17", // subjectAltName OID
          critical: false,
          extnValue: altNames.toSchema().toBER(false),
        })

        const extensions = new pkijs.Extensions({
          extensions: [sanExtension],
        })

        // Add extensions as attribute
        pkcs10.attributes = [
          new pkijs.Attribute({
            type: "1.2.840.113549.1.9.14", // extensionRequest OID
            values: [extensions.toSchema()],
          }),
        ]
      }

      // Set public key and sign
      await pkcs10.subjectPublicKeyInfo.importKey(publicKey)

      await pkcs10.sign(privateKey, "SHA-256")

      // Export CSR
      const csrBer = pkcs10.toSchema().toBER(false)
      const csrPEM = formatPEM(arrayBufferToBase64(csrBer), "CERTIFICATE REQUEST")

      // Export private key (or use existing)
      let privateKeyPEM: string
      if (keyMode === "existing") {
        // Use the original PEM
        privateKeyPEM = existingKey.trim()
      } else {
        const privateKeyData = await crypto.exportKey("pkcs8", privateKey)
        privateKeyPEM = formatPEM(arrayBufferToBase64(privateKeyData), "PRIVATE KEY")
      }

      setResult({
        csr: csrPEM,
        privateKey: privateKeyPEM,
        algorithm: detectedKeyType,
        keySize: detectedKeySize,
        sans: uniqueSans,
      })
    } catch (err) {
      console.error("CSR generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate CSR")
    } finally {
      setLoading(false)
    }
  }, [formData, sans, keyMode, existingKey])

  const handleCopy = useCallback(async (type: "csr" | "key", content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const handleDownload = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileKey className="h-5 w-5 text-cyan-500" />
            CSR Generator
          </CardTitle>
          <CardDescription>
            Generate a Certificate Signing Request and private key. All cryptographic operations happen in your browser
            - your private key never leaves this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Mode Selection */}
          <Tabs value={keyMode} onValueChange={(v) => {
            setKeyMode(v as "generate" | "existing")
            setResult(null)
            setError(null)
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="gap-2">
                <Key className="h-4 w-4" />
                Generate New Key
              </TabsTrigger>
              <TabsTrigger value="existing" className="gap-2">
                <Upload className="h-4 w-4" />
                Use Existing Key
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-4 space-y-4">
              {/* Key Settings for new key generation */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Key Type</Label>
                  <Select
                    value={formData.keyType}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        keyType: value,
                        keySize: value === "RSA" ? "2048" : "256",
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RSA">RSA</SelectItem>
                      <SelectItem value="EC">ECDSA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Key Size</Label>
                  <Select
                    value={formData.keySize}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, keySize: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.keyType === "RSA" ? (
                        <>
                          <SelectItem value="2048">2048 bits</SelectItem>
                          <SelectItem value="3072">3072 bits</SelectItem>
                          <SelectItem value="4096">4096 bits</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="256">P-256</SelectItem>
                          <SelectItem value="384">P-384</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="mt-4 space-y-4">
              {/* Existing Key Input */}
              <div className="space-y-2">
                <Label>
                  Private Key (PEM format) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkq...
-----END PRIVATE KEY-----"
                  value={existingKey}
                  onChange={(e) => setExistingKey(e.target.value)}
                  className="min-h-40 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Paste your existing private key in PKCS#8 PEM format. Supports RSA and ECDSA keys.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Subject Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Common Name (CN) <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="example.com"
                value={formData.commonName}
                onChange={(e) => setFormData((prev) => ({ ...prev, commonName: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">The primary domain name (FQDN)</p>
            </div>

            {/* Subject Alternative Names */}
            <div className="space-y-2">
              <Label>Subject Alternative Names (SANs)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="domain, email, or IP"
                  value={sanInput}
                  onChange={(e) => {
                    setSanInput(e.target.value)
                    if (sanError) setSanError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSan()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddSan}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {sans.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {sans.map((san) => (
                    <Badge key={san} variant="secondary" className="gap-1 font-mono text-xs">
                      {san}
                      <button
                        type="button"
                        onClick={() => handleRemoveSan(san)}
                        className="ml-1 rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {sanError && (
                <p className="text-xs text-destructive">{sanError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Add domains, email addresses, or IP addresses (e.g., www.example.com, user@example.com, 192.168.1.1)
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization (O)</Label>
                <Input
                  placeholder="My Company Inc."
                  value={formData.organization}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Organizational Unit (OU)</Label>
                <Input
                  placeholder="IT Department"
                  value={formData.organizationalUnit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizationalUnit: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>City/Locality (L)</Label>
                <Input
                  placeholder="San Francisco"
                  value={formData.locality}
                  onChange={(e) => setFormData((prev) => ({ ...prev, locality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>State/Province (ST)</Label>
                <Input
                  placeholder="California"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Country (C)</Label>
                <Input
                  placeholder="US"
                  maxLength={2}
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Generating..." : keyMode === "existing" ? "Generate CSR" : "Generate CSR & Private Key"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShareUrl}
              title="Copy share URL"
            >
              {urlCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
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

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* CSR */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-cyan-500" />
                    Certificate Signing Request
                  </CardTitle>
                  <CardDescription>Submit this to your Certificate Authority</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{result.algorithm}</Badge>
                  <Badge variant="outline">{result.keySize} {result.algorithm === "RSA" ? "bits" : ""}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.sans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Included SANs:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.sans.map((san) => (
                      <Badge key={san} variant="secondary" className="font-mono text-xs">
                        {san}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Textarea value={result.csr} readOnly className="min-h-48 font-mono text-xs" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("csr", result.csr)}
                  className="gap-1"
                >
                  {copied === "csr" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "csr" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(`${formData.commonName}.csr`, result.csr)}
                  className="gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Private Key */}
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-amber-500">
                <AlertCircle className="h-5 w-5" />
                Private Key
              </CardTitle>
              <CardDescription>
                Keep this secret! Never share your private key. Store it securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={result.privateKey} readOnly className="min-h-48 font-mono text-xs" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("key", result.privateKey)}
                  className="gap-1"
                >
                  {copied === "key" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "key" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(`${formData.commonName}.key`, result.privateKey)}
                  className="gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
