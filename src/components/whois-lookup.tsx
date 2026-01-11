"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Check, Globe, Hash, Network, Search, Share2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type React from "react"
import { Spinner } from "@/components/ui/spinner"
import { OsintResults } from "@/components/osint-results"

const EXAMPLE_QUERIES = [
  { label: "google.com", icon: Globe, type: "domain" },
  { label: "8.8.8.8", icon: Network, type: "ip" },
  { label: "AS15169", icon: Hash, type: "asn" },
]

type QueryType = "domain" | "ipv4" | "ipv6" | "asn"

function detectQueryType(query: string): QueryType {
  if (/^(AS)?(\\d+)$/i.test(query)) {
    return "asn"
  }

  if (query.includes(":")) {
    return "ipv6"
  }

  if (/^(\\d{1,3}\\.){3}\\d{1,3}$/.test(query)) {
    return "ipv4"
  }

  return "domain"
}

export function WhoisLookup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rdapData, setRdapData] = useState<any>(null)
  const [dnsData, setDnsData] = useState<any>(null)
  const [httpData, setHttpData] = useState<any>(null)
  const [certData, setCertData] = useState<any>(null)
  const [ipData, setIpData] = useState<any>(null)
  const [osintErrors, setOsintErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [certDnsData, setCertDnsData] = useState<Record<string, any> | null>(null)
  const [certDnsPending, setCertDnsPending] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const hasAutoSearched = useRef(false)
  const prevUrlQuery = useRef(initialQuery)

  const handleShare = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const performLookup = useCallback(
    async (searchQuery: string, updateUrl = true) => {
      if (!searchQuery.trim()) {
        setError("Please enter a domain, IP address, or ASN")
        return
      }

      setLoading(true)
      setError(null)
      setRdapData(null)
      setDnsData(null)
      setHttpData(null)
      setCertData(null)
      setIpData(null)
      setOsintErrors({})
      setPending({})
      setCertDnsData(null)
      setCertDnsPending({})

      // Update URL with query parameter
      if (updateUrl) {
        const trimmedQuery = searchQuery.trim()
        const params = new URLSearchParams(searchParams.toString())
        params.set("q", trimmedQuery)
        prevUrlQuery.current = trimmedQuery // Prevent useEffect from re-triggering
        router.push(`${pathname}?${params.toString()}`)
      }

      try {
        const trimmed = searchQuery.trim()
        const fetchJson = async (url: string) => {
          const response = await fetch(url)
          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || "Failed to fetch information")
          }

          return result
        }

        const queryType = detectQueryType(trimmed)
        const tasks: Array<{ key: string; promise: Promise<any> }> = [
          { key: "rdap", promise: fetchJson(`/api/whois?query=${encodeURIComponent(trimmed)}`) },
        ]

        if (queryType === "domain") {
          tasks.push(
            { key: "dns", promise: fetchJson(`/api/osint/dns?target=${encodeURIComponent(trimmed)}`) },
            { key: "http", promise: fetchJson(`/api/osint/http?target=${encodeURIComponent(trimmed)}`) },
            { key: "certs", promise: fetchJson(`/api/osint/certificates?target=${encodeURIComponent(trimmed)}`) },
            { key: "ip", promise: fetchJson(`/api/osint/ip?target=${encodeURIComponent(trimmed)}`) },
          )
        }

        if (queryType === "ipv4" || queryType === "ipv6") {
          tasks.push(
            { key: "http", promise: fetchJson(`/api/osint/http?target=${encodeURIComponent(trimmed)}`) },
            { key: "ip", promise: fetchJson(`/api/osint/ip?target=${encodeURIComponent(trimmed)}`) },
          )
        }

        const requestedKeys = new Set(tasks.map((task) => task.key))
        setPending(Object.fromEntries(tasks.map((task) => [task.key, true])))

        const baselineErrors: Record<string, string> = {}
        if (!requestedKeys.has("dns")) baselineErrors.dns = "Not applicable for this query type"
        if (!requestedKeys.has("http")) baselineErrors.http = "Not applicable for this query type"
        if (!requestedKeys.has("certs")) baselineErrors.certs = "Not applicable for this query type"
        if (!requestedKeys.has("ip")) baselineErrors.ip = "Not applicable for this query type"
        setOsintErrors(baselineErrors)

        const taskPromises = tasks.map((task) => task.promise)
        tasks.forEach((task) => {
          task.promise
            .then((value) => {
              if (task.key === "rdap") setRdapData(value)
              if (task.key === "dns") setDnsData(value)
              if (task.key === "http") setHttpData(value)
              if (task.key === "certs") setCertData(value)
              if (task.key === "ip") setIpData(value)
            })
            .catch((err) => {
              setOsintErrors((prev) => ({
                ...prev,
                [task.key]: err instanceof Error ? err.message : "Lookup failed",
              }))
            })
            .finally(() => {
              setPending((prev) => ({ ...prev, [task.key]: false }))
            })
        })

        const settled = await Promise.allSettled(taskPromises)
        if (settled.every((result) => result.status === "rejected")) {
          setError("No intelligence data available for this query")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    },
    [pathname, router, searchParams]
  )

  // Sync state with URL search params (only on URL changes, not local edits)
  useEffect(() => {
    const urlQuery = searchParams.get("q") || ""

    if (urlQuery && !hasAutoSearched.current) {
      // Initial load with query param
      hasAutoSearched.current = true
      prevUrlQuery.current = urlQuery
      setQuery(urlQuery)
      performLookup(urlQuery, false)
    } else if (urlQuery !== prevUrlQuery.current) {
      // URL actually changed (back/forward navigation)
      prevUrlQuery.current = urlQuery
      setQuery(urlQuery)
      if (urlQuery) {
        performLookup(urlQuery, false)
      } else {
        setRdapData(null)
        setDnsData(null)
        setHttpData(null)
        setCertData(null)
        setIpData(null)
        setOsintErrors({})
        setPending({})
        setCertDnsData(null)
        setCertDnsPending({})
        setError(null)
      }
    }
  }, [searchParams, performLookup])

  // Fetch DNS for certificate domains when certs are loaded
  useEffect(() => {
    if (!certData?.names || certData.names.length === 0) return

    const mainDomain = query.toLowerCase().replace(/^www\./, "")

    // Get unique subdomains from cert names (excluding wildcards and main domain)
    const subdomains = certData.names
      .filter((name: string) => {
        const normalized = name.toLowerCase().replace(/^\*\./, "").replace(/^www\./, "")
        return normalized !== mainDomain && !name.startsWith("*")
      })
      .slice(0, 10) // Limit to 10 subdomains to avoid too many requests

    if (subdomains.length === 0) return

    // Initialize pending state
    setCertDnsPending(Object.fromEntries(subdomains.map((d: string) => [d, true])))
    setCertDnsData({})

    // Fetch DNS for each subdomain
    const fetchDns = async (domain: string) => {
      try {
        const response = await fetch(`/api/osint/dns?target=${encodeURIComponent(domain)}`)
        const result = await response.json()

        if (!response.ok) {
          return { error: result.error || "DNS lookup failed" }
        }
        return result
      } catch {
        return { error: "DNS lookup failed" }
      }
    }

    subdomains.forEach((domain: string) => {
      fetchDns(domain).then((result) => {
        setCertDnsData((prev) => ({ ...prev, [domain]: result }))
        setCertDnsPending((prev) => ({ ...prev, [domain]: false }))
      })
    })
  }, [certData, query])

  const handleLookup = async (e?: React.FormEvent, queryOverride?: string) => {
    e?.preventDefault()
    const searchQuery = queryOverride || query
    if (queryOverride) {
      setQuery(queryOverride)
    }
    performLookup(searchQuery)
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    performLookup(example)
  }

  const hasResults = Boolean(rdapData || dnsData || httpData || certData || ipData)

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Main Search Input */}
        <form onSubmit={handleLookup}>
          <div className="group relative">
            <div className="absolute -inset-0.5 rounded-2xl bg-linear-to-r from-primary/50 via-primary/25 to-primary/50 opacity-0 blur transition-all duration-500 group-focus-within:opacity-100" />
            <div className="relative flex items-center rounded-xl border-2 bg-background shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-lg">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter domain, IP address, or ASN..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 border-0 bg-transparent pl-12 pr-32 text-base font-mono shadow-none focus-visible:ring-0"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="absolute right-2 h-10 gap-2 rounded-lg px-5 font-medium"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Searching</span>
                  </>
                ) : (
                  <>
                    <span>Lookup</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Examples */}
        {!hasResults && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example.label}
                onClick={() => handleExampleClick(example.label)}
                disabled={loading}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-mono transition-all hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50"
              >
                <example.icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                {example.label}
              </button>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Results Section */}
      {(rdapData || dnsData || httpData || certData || ipData) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Share Button */}
          <div className="mb-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Link copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </>
              )}
            </Button>
          </div>
          <OsintResults
            rdapData={rdapData}
            dnsData={dnsData}
            httpData={httpData}
            certData={certData}
            ipData={ipData}
            query={query}
            errors={osintErrors}
            pending={pending}
            certDnsData={certDnsData}
            certDnsPending={certDnsPending}
          />
        </div>
      )}
    </div>
  )
}
