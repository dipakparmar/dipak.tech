"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import {
  Globe,
  MapPin,
  Network,
  Shield,
  Clock,
  Server,
  Copy,
  Check,
  Loader2,
  Search,
  Info,
} from "lucide-react"
import { IPResponse } from "@/types/ip"
import { Map, MapMarker, MapTileLayer, MapPopup } from "@/components/ui/map"
import { siteConfig } from "@/lib/og-config"

const BLUR_FADE_DELAY = 0.04

export default function IPInfoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ipData, setIpData] = useState<IPResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customIp, setCustomIp] = useState("")
  const [copied, setCopied] = useState(false)
  const [isCustomLookup, setIsCustomLookup] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    // Set base URL for API examples based on current host
    const host = window.location.host
    if (host.includes(siteConfig.ip.domain)) {
      setBaseUrl(siteConfig.ip.baseUrl)
    } else if (host.includes(siteConfig.tools.domain)) {
      setBaseUrl(siteConfig.tools.baseUrl)
    } else {
      // Development or other environment
      setBaseUrl(window.location.origin)
    }

    // Check URL params for IP (support both 'target' and 'ip' params)
    const urlIp = searchParams.get("target") || searchParams.get("ip")

    if (urlIp) {
      setCustomIp(urlIp)
      setShowSearch(true)
      fetchIPInfo(urlIp)
    } else {
      // Load user's IP on mount
      fetchIPInfo()
    }
  }, [searchParams])

  const fetchIPInfo = async (ip?: string) => {
    setLoading(true)
    setError(null)
    setIsCustomLookup(!!ip)

    try {
      const params = new URLSearchParams({ details: "true" })
      if (ip) {
        params.set("ip", ip)
      }

      const response = await fetch(`/api/ip?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch IP info: ${response.status}`)
      }

      const data: IPResponse = await response.json()

      if (data.status === "fail") {
        throw new Error(data.message || "Failed to fetch IP information")
      }

      setIpData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCustomLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (customIp.trim()) {
      // Update URL with IP param
      router.push(`/tools/ip?ip=${encodeURIComponent(customIp.trim())}`)
      fetchIPInfo(customIp.trim())
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <BlurFade delay={BLUR_FADE_DELAY}>
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-500" />
            <h1 className="text-3xl font-bold">IP Information</h1>
          </div>
          <p className="text-muted-foreground">
            View detailed information about your IP address or lookup any IP
          </p>
        </div>
      </BlurFade>

      {/* Toggle Search Button - Only show when search is hidden */}
      {!showSearch && !loading && (
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <div className="mb-6 flex justify-center">
            <Button variant="outline" onClick={() => setShowSearch(true)} className="gap-2">
              <Search className="h-4 w-4" />
              Lookup Different IP
            </Button>
          </div>
        </BlurFade>
      )}

      {/* Custom IP Lookup */}
      {showSearch && (
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Lookup IP Address
              </CardTitle>
              <CardDescription>Enter an IP address to view its details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomLookup} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., 8.8.8.8"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" disabled={loading || !customIp.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Lookup
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Error State */}
      {error && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <Info className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Loading State */}
      {loading && !ipData && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* IP Information Display */}
      {ipData && !loading && (
        <>
          {/* Main IP Card */}
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <Card className="mb-6 border-blue-500/50 bg-linear-to-br from-blue-50 to-transparent dark:from-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="text-center sm:text-left">
                    <Label className="text-xs text-muted-foreground">
                      {isCustomLookup ? "IP Address" : "Your IP Address"}
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-3xl font-bold tracking-tight">{ipData.ip}</p>
                      <Badge variant="outline" className="text-xs">
                        {ipData.ip_type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(ipData.ip || "")}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Location Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <p className="mt-1 font-medium">
                      {ipData.country} ({ipData.countryCode})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <p className="mt-1 font-medium">{ipData.regionName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="mt-1 font-medium">{ipData.city || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                    <p className="mt-1 font-medium">{ipData.zip || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Coordinates</Label>
                    <p className="mt-1 font-mono text-sm">
                      {ipData.lat?.toFixed(4)}, {ipData.lon?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    <p className="mt-1 font-medium">{ipData.timezone}</p>
                  </div>
                </div>

                {/* Map */}
                {ipData.lat && ipData.lon && (
                  <div className="h-100 w-full overflow-hidden rounded-md border">
                    <Map center={[ipData.lat, ipData.lon]} zoom={10} className="rounded-md">
                      <MapTileLayer />
                      <MapMarker
                        position={[ipData.lat, ipData.lon]}
                        icon={
                          <div className="relative flex items-center justify-center">
                            {/* Pulse animation */}
                            <div className="absolute h-8 w-8 animate-ping rounded-full bg-blue-500 opacity-75" />
                            {/* Outer ring */}
                            <div className="absolute h-8 w-8 rounded-full bg-blue-500/30" />
                            {/* Inner marker */}
                            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                              <MapPin className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        }
                        iconAnchor={[16, 16]}
                      >
                        <MapPopup>
                          <div className="min-w-48 space-y-3">
                            {/* IP Address */}
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Network className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">IP Address</p>
                                <p className="font-mono font-semibold">{ipData.ip}</p>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">Location</p>
                                  <p className="text-sm font-medium">
                                    {ipData.city}, {ipData.regionName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {ipData.country} ({ipData.countryCode})
                                  </p>
                                </div>
                              </div>

                              {/* ISP */}
                              {ipData.isp && (
                                <div className="flex items-start gap-2">
                                  <Globe className="mt-0.5 h-3.5 w-3.5 text-green-500" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">ISP</p>
                                    <p className="text-sm font-medium">{ipData.isp}</p>
                                  </div>
                                </div>
                              )}

                              {/* Coordinates */}
                              <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                                <p className="font-mono text-xs text-muted-foreground">
                                  {ipData.lat?.toFixed(4)}, {ipData.lon?.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </MapPopup>
                      </MapMarker>
                    </Map>
                  </div>
                )}
              </CardContent>
            </Card>
          </BlurFade>

          {/* Network Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Network className="h-5 w-5 text-green-500" />
                  Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ISP</Label>
                    <p className="mt-1 font-medium">{ipData.isp}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Organization</Label>
                    <p className="mt-1 font-medium">{ipData.org}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AS Number</Label>
                    <p className="mt-1 font-mono text-sm">{ipData.as}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AS Name</Label>
                    <p className="mt-1 font-medium">{ipData.asname}</p>
                  </div>
                  {ipData.reverse && (
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Reverse DNS</Label>
                      <p className="mt-1 font-mono text-sm">{ipData.reverse}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          {/* Security Information */}
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-yellow-500" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={ipData.mobile ? "default" : "secondary"}>
                      {ipData.mobile ? "Mobile" : "Not Mobile"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ipData.proxy ? "destructive" : "secondary"}
                      className={ipData.proxy ? "bg-orange-500" : ""}
                    >
                      {ipData.proxy ? "Proxy Detected" : "No Proxy"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ipData.hosting ? "default" : "secondary"}>
                      {ipData.hosting ? "Hosting/VPN" : "Not Hosting"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>

        </>
      )}

      {/* API Usage */}
      <BlurFade delay={BLUR_FADE_DELAY * 7}>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" />
              API Usage
            </CardTitle>
            <CardDescription>Access IP information programmatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Get your IP (simple)</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl ? `curl ${baseUrl}/api/ip` : "curl /api/ip"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Get detailed info</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl ? `curl ${baseUrl}/api/ip?details=true` : "curl /api/ip?details=true"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lookup specific IP or domain</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl
                  ? `curl ${baseUrl}/api/ip?target=8.8.8.8&details=true`
                  : "curl /api/ip?target=8.8.8.8&details=true"}
              </code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Resolve domain to IP</Label>
              <code className="mt-1 block rounded-md bg-muted p-2 text-sm">
                {baseUrl
                  ? `curl ${baseUrl}/api/ip?target=google.com&details=true`
                  : "curl /api/ip?target=google.com&details=true"}
              </code>
            </div>
            {ipData?.req_left !== undefined && (
              <div className="mt-6 flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Rate Limit: {ipData.req_left} requests remaining, resets in {ipData.resets_in}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  )
}
