import type { LiveAuthLookupContext } from "./message-auth-context"

export type CheckStatus = "ok" | "problem" | "warning" | "info"

export interface LiveCheck {
  label: string
  status: CheckStatus
  message: string
}

export interface SpfMechanismRow {
  prefix: string
  type: string
  value: string
  prefixDescription: string
  description: string
}

export interface LiveDmarcResult {
  domain: string
  record: string | null
  tags: {
    p: string | null
    sp: string | null
    adkim: string | null
    aspf: string | null
    pct: number | null
    rua: string[]
    ruf: string[]
  }
  checks: LiveCheck[]
}

export interface LiveSpfResult {
  domain: string
  clientIp: string | null
  record: string | null
  recordsFound: number
  evaluation: {
    result: string
    explanation: string
  } | null
  mechanisms: SpfMechanismRow[]
  checks: LiveCheck[]
}

export interface LiveDkimResult {
  domain: string
  selector: string
  record: string | null
  tags: {
    v: string | null
    p: string | null
    k: string | null
  }
  checks: LiveCheck[]
}

export interface LiveAuthVerificationResponse {
  context: LiveAuthLookupContext
  dnsProvider: {
    name: string | null
    nameserver: string | null
  }
  dmarc: LiveDmarcResult | null
  spf: LiveSpfResult | null
  dkim: LiveDkimResult[]
  checkedAt: string
}

const SPF_PREFIX_DESCRIPTIONS: Record<string, string> = {
  "+": "Pass",
  "-": "Fail",
  "~": "SoftFail",
  "?": "Neutral"
}

const SPF_MECHANISM_DESCRIPTIONS: Record<string, string> = {
  all: "Always matches. It should appear at the end of the record.",
  include: "Matches when the included domain's SPF evaluation returns pass.",
  ip4: "Authorizes the listed IPv4 address or network.",
  ip6: "Authorizes the listed IPv6 address or network.",
  a: "Authorizes the current domain's A or AAAA records, or another named host.",
  mx: "Authorizes the IPs behind the domain's MX hosts.",
  exists: "Matches if the named domain returns any DNS A record.",
  ptr: "Deprecated mechanism based on reverse DNS."
}

export function parseTagList(record: string): Record<string, string> {
  return record
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const eqIndex = part.indexOf("=")
      if (eqIndex === -1) return acc
      const key = part.slice(0, eqIndex).trim().toLowerCase()
      const value = part.slice(eqIndex + 1).trim()
      acc[key] = value
      return acc
    }, {})
}

export function parseSpfMechanisms(record: string): SpfMechanismRow[] {
  return record
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((token) => {
      const match = token.match(/^([+?~-]?)([a-z0-9]+)(?::([^/]+(?:\/[^/]+)?))?$/i)
      if (!match) {
        return {
          prefix: "",
          type: token,
          value: "",
          prefixDescription: "",
          description: "Unrecognized SPF token"
        }
      }

      const [, qualifier = "", type, rawValue = ""] = match
      return {
        prefix: qualifier,
        type: type.toLowerCase(),
        value: rawValue,
        prefixDescription: SPF_PREFIX_DESCRIPTIONS[qualifier || "+"] ?? "",
        description: SPF_MECHANISM_DESCRIPTIONS[type.toLowerCase()] ?? "SPF mechanism or modifier"
      }
    })
}
