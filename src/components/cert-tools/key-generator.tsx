"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Key, Copy, Check, Download, Lock, Unlock, Share2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { normalizeToolsPathname } from "@/lib/tool-routing"

interface KeyPairResult {
  publicKey: string
  privateKey: string
  algorithm: string
  keySize: string
  format: string
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

// Format PEM with line breaks
function formatPEM(base64: string, type: string): string {
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`
}

interface KeyGeneratorProps {
  initialValues?: {
    algorithm?: string
    keySize?: string
    usage?: string
  }
}

export function KeyGenerator({ initialValues }: KeyGeneratorProps) {
  const pathname = usePathname()
  const [settings, setSettings] = useState({
    algorithm: initialValues?.algorithm || "RSA",
    keySize: initialValues?.keySize || "2048",
    usage: initialValues?.usage || "sign",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<KeyPairResult | null>(null)
  const [copied, setCopied] = useState<"public" | "private" | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  const handleShareUrl = useCallback(async () => {
    const params = new URLSearchParams()
    params.set("tool", "keygen")
    if (settings.algorithm !== "RSA") params.set("algorithm", settings.algorithm)
    if (settings.keySize !== "2048") params.set("keySize", settings.keySize)
    if (settings.usage !== "sign") params.set("usage", settings.usage)
    const host = window.location.host
    const resolvedPath = normalizeToolsPathname(pathname, host)
    const url = `${window.location.origin}${resolvedPath}?${params.toString()}`
    await navigator.clipboard.writeText(url)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }, [settings, pathname])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setResult(null)

    try {
      let keyPair: CryptoKeyPair
      let algorithm: RsaHashedKeyGenParams | EcKeyGenParams

      if (settings.algorithm === "RSA") {
        const rsaAlgo = settings.usage === "encrypt" ? "RSA-OAEP" : "RSASSA-PKCS1-v1_5"
        algorithm = {
          name: rsaAlgo,
          modulusLength: parseInt(settings.keySize),
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        }
        keyPair = await crypto.subtle.generateKey(
          algorithm,
          true,
          settings.usage === "encrypt" ? ["encrypt", "decrypt"] : ["sign", "verify"]
        )
      } else {
        algorithm = {
          name: "ECDSA",
          namedCurve: settings.keySize === "256" ? "P-256" : settings.keySize === "384" ? "P-384" : "P-521",
        }
        keyPair = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"])
      }

      // Export keys
      const privateKeyData = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
      const publicKeyData = await crypto.subtle.exportKey("spki", keyPair.publicKey)

      const privateKeyPEM = formatPEM(arrayBufferToBase64(privateKeyData), "PRIVATE KEY")
      const publicKeyPEM = formatPEM(arrayBufferToBase64(publicKeyData), "PUBLIC KEY")

      setResult({
        publicKey: publicKeyPEM,
        privateKey: privateKeyPEM,
        algorithm: settings.algorithm,
        keySize: settings.keySize,
        format: "PEM (PKCS#8 / SPKI)",
      })
    } catch (err) {
      console.error("Key generation failed:", err)
    } finally {
      setLoading(false)
    }
  }, [settings])

  const handleCopy = useCallback(async (type: "public" | "private", content: string) => {
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
      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-cyan-500" />
            Key Pair Generator
          </CardTitle>
          <CardDescription>
            Generate cryptographic key pairs using the Web Crypto API. All operations happen in your browser - keys
            never leave this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select
                value={settings.algorithm}
                onValueChange={(value) => {
                  setSettings((prev) => ({
                    ...prev,
                    algorithm: value,
                    keySize: value === "RSA" ? "2048" : "256",
                    usage: value === "EC" ? "sign" : prev.usage,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSA">RSA</SelectItem>
                  <SelectItem value="EC">ECDSA (Elliptic Curve)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Key Size</Label>
              <Select
                value={settings.keySize}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, keySize: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.algorithm === "RSA" ? (
                    <>
                      <SelectItem value="2048">2048 bits (Standard)</SelectItem>
                      <SelectItem value="3072">3072 bits (Strong)</SelectItem>
                      <SelectItem value="4096">4096 bits (Very Strong)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="256">P-256 (secp256r1)</SelectItem>
                      <SelectItem value="384">P-384 (secp384r1)</SelectItem>
                      <SelectItem value="521">P-521 (secp521r1)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {settings.algorithm === "RSA" && (
              <div className="space-y-2">
                <Label>Key Usage</Label>
                <Select
                  value={settings.usage}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, usage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sign">Signing (RSASSA-PKCS1-v1_5)</SelectItem>
                    <SelectItem value="encrypt">Encryption (RSA-OAEP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Generating..." : "Generate Key Pair"}
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
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{result.algorithm}</Badge>
            <Badge variant="outline">
              {result.keySize} {result.algorithm === "RSA" ? "bits" : ""}
            </Badge>
            <Badge variant="outline">{result.format}</Badge>
          </div>

          {/* Public Key */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Unlock className="h-5 w-5 text-emerald-500" />
                    Public Key
                  </CardTitle>
                  <CardDescription>Share this key publicly for verification or encryption</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={result.publicKey} readOnly className="min-h-40 font-mono text-xs" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("public", result.publicKey)}
                  className="gap-1"
                >
                  {copied === "public" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "public" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload("public_key.pem", result.publicKey)}
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
                <Lock className="h-5 w-5" />
                Private Key
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Keep this secret! Never share your private key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={result.privateKey} readOnly className="min-h-40 font-mono text-xs" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy("private", result.privateKey)}
                  className="gap-1"
                >
                  {copied === "private" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "private" ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload("private_key.pem", result.privateKey)}
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
