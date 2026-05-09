import type { WAFResult } from "./osint-types"

interface WAFSignature {
  name: string
  capabilities: string[]
  headers: Array<{ key: string; value?: string | RegExp }>
}

const SIGNATURES: WAFSignature[] = [
  {
    name: "Cloudflare",
    capabilities: ["WAF", "CDN", "DDoS Protection"],
    headers: [{ key: "cf-ray" }, { key: "server", value: "cloudflare" }],
  },
  {
    name: "AWS CloudFront",
    capabilities: ["CDN"],
    headers: [{ key: "x-amz-cf-id" }, { key: "via", value: /cloudfront/ }],
  },
  {
    name: "Fastly",
    capabilities: ["CDN"],
    headers: [{ key: "x-served-by" }, { key: "fastly-restarts" }],
  },
  {
    name: "Akamai",
    capabilities: ["WAF", "CDN", "DDoS Protection"],
    headers: [{ key: "x-akamai-transformed" }, { key: "akamai-cache-status" }],
  },
  {
    name: "Imperva",
    capabilities: ["WAF"],
    headers: [{ key: "x-iinfo" }, { key: "x-cdn", value: /Incapsula/i }],
  },
  {
    name: "Sucuri",
    capabilities: ["WAF"],
    headers: [{ key: "x-sucuri-id" }, { key: "x-sucuri-cache" }],
  },
  {
    name: "Vercel",
    capabilities: ["CDN"],
    headers: [{ key: "x-vercel-id" }, { key: "x-vercel-cache" }],
  },
]

export function detectWAF(headers: Record<string, string>): WAFResult {
  const lowerHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v.toLowerCase()
  }

  for (const sig of SIGNATURES) {
    const matched = sig.headers.some((h) => {
      const val = lowerHeaders[h.key.toLowerCase()]
      if (!val) return false
      if (!h.value) return true
      if (h.value instanceof RegExp) return h.value.test(val)
      return val.includes(h.value.toLowerCase())
    })

    if (matched) {
      return { detected: true, name: sig.name, capabilities: sig.capabilities }
    }
  }

  return { detected: false, name: null, capabilities: [] }
}
