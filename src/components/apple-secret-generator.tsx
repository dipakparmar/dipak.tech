"use client"

import { useState, useCallback } from "react"
import { useHaptics } from "@/hooks/use-haptics"
import {
  Apple,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react"
import { HapticButton as Button } from "@/components/haptic-wrappers"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HapticSelectItem as SelectItem } from "@/components/haptic-wrappers"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

const MAX_LIFETIME_SECONDS = 15_552_000 // 180 days (6 months)

type LifetimeUnit = "seconds" | "minutes" | "hours" | "days"

const UNIT_MULTIPLIERS: Record<LifetimeUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
}

interface GeneratedToken {
  jwt: string
  header: Record<string, string>
  payload: Record<string, string | number>
  iat: number
  exp: number
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text))
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  })
}

async function importP8Key(pem: string): Promise<CryptoKey> {
  // Strip PEM headers and whitespace
  const stripped = pem
    .replace(/-----BEGIN (EC )?PRIVATE KEY-----/g, "")
    .replace(/-----END (EC )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "")

  // Decode base64 to binary
  const binaryString = atob(stripped)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  )
}

export function AppleSecretGenerator() {
  const { trigger } = useHaptics()
  const [teamId, setTeamId] = useState("")
  const [clientId, setClientId] = useState("")
  const [keyId, setKeyId] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [lifetimeValue, setLifetimeValue] = useState("1")
  const [lifetimeUnit, setLifetimeUnit] = useState<LifetimeUnit>("hours")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const lifetimeSeconds = Math.floor(
    (parseFloat(lifetimeValue) || 0) * UNIT_MULTIPLIERS[lifetimeUnit]
  )
  const lifetimeExceedsMax = lifetimeSeconds > MAX_LIFETIME_SECONDS
  const isValid =
    teamId.trim() !== "" &&
    clientId.trim() !== "" &&
    keyId.trim() !== "" &&
    privateKey.trim() !== "" &&
    lifetimeSeconds > 0 &&
    !lifetimeExceedsMax

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const key = await importP8Key(privateKey)

      const now = Math.floor(Date.now() / 1000)
      const exp = now + lifetimeSeconds

      const header = {
        alg: "ES256",
        kid: keyId.trim(),
        typ: "JWT",
      }

      const payload = {
        iss: teamId.trim(),
        sub: clientId.trim(),
        aud: "https://appleid.apple.com",
        iat: now,
        exp,
      }

      const headerB64 = textToBase64Url(JSON.stringify(header))
      const payloadB64 = textToBase64Url(JSON.stringify(payload))
      const signingInput = `${headerB64}.${payloadB64}`

      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        new TextEncoder().encode(signingInput)
      )

      // Web Crypto in browsers returns raw r||s format (64 bytes for P-256), which is what JWT needs
      const signatureB64 = base64UrlEncode(new Uint8Array(signature))

      const jwt = `${headerB64}.${payloadB64}.${signatureB64}`

      setResult({ jwt, header, payload, iat: now, exp })
      trigger("success")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Invalid private key or unsupported format: ${message}`)
      trigger("error")
    } finally {
      setLoading(false)
    }
  }, [privateKey, teamId, clientId, keyId, lifetimeSeconds, trigger])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.jwt)
    trigger("success")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result, trigger])

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Apple className="h-5 w-5 text-cyan-500" />
            Apple Client Secret Generator
          </CardTitle>
          <CardDescription>
            Generate a signed JWT for use as <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">client_secret</code> with
            Sign in with Apple. All signing happens client-side — your private key never leaves this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* IDs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="team-id">Team ID (iss)</Label>
              <Input
                id="team-id"
                placeholder="e.g. ABCDE12345"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="font-mono"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID (sub)</Label>
              <Input
                id="client-id"
                placeholder="e.g. com.example.app"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-id">Key ID (kid)</Label>
              <Input
                id="key-id"
                placeholder="e.g. ABC123DEFG"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                className="font-mono"
                maxLength={10}
              />
            </div>
          </div>

          {/* Lifetime */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lifetime-value">Token Lifetime</Label>
              <Input
                id="lifetime-value"
                type="number"
                min="1"
                placeholder="1"
                value={lifetimeValue}
                onChange={(e) => setLifetimeValue(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lifetime-unit">Unit</Label>
              <Select
                value={lifetimeUnit}
                onValueChange={(v) => setLifetimeUnit(v as LifetimeUnit)}
              >
                <SelectTrigger id="lifetime-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {lifetimeExceedsMax && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Token lifetime exceeds Apple&apos;s maximum of 180 days ({MAX_LIFETIME_SECONDS.toLocaleString()} seconds).
              </AlertDescription>
            </Alert>
          )}

          {/* Private Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="private-key">Private Key (.p8 PEM)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
                className="h-7 gap-1 text-xs text-muted-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
            {showKey ? (
              <Textarea
                id="private-key"
                placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="min-h-32 font-mono text-xs"
              />
            ) : (
              <div
                className="flex min-h-32 cursor-pointer items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground"
                onClick={() => setShowKey(true)}
              >
                {privateKey
                  ? `Key loaded (${privateKey.trim().split("\n").length} lines)`
                  : "Click to paste your .p8 private key"}
              </div>
            )}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This tool is for <strong>local/internal developer use only</strong>. Your private key
              is processed entirely in the browser and is never sent to any server.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleGenerate} disabled={!isValid || loading} className="w-full sm:w-auto">
            {loading ? "Generating..." : "Generate Client Secret"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Token Info Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">ES256</Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(result.iat)} → {formatTimestamp(result.exp)}
            </Badge>
          </div>

          {/* JWT Output */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Client Secret (JWT)</CardTitle>
                  <CardDescription>
                    Use this as <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">client_secret</code> in
                    Sign in with Apple token requests
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={result.jwt}
                readOnly
                className="min-h-24 font-mono text-xs break-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </CardContent>
          </Card>

          {/* Decoded Header & Payload */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Decoded Header
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {JSON.stringify(result.header, null, 2)}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Decoded Payload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {JSON.stringify(result.payload, null, 2)}
                </pre>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong>Issued:</strong> {formatTimestamp(result.iat)}
                  </p>
                  <p>
                    <strong>Expires:</strong> {formatTimestamp(result.exp)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

