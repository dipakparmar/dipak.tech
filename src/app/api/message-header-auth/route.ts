import { isIP } from "node:net"
import { NextResponse } from "next/server"
import { captureAPIError } from "@/lib/sentry-utils"
import type { LiveAuthLookupContext } from "@/lib/message-auth-context"
import type { CheckStatus, LiveAuthVerificationResponse, LiveCheck } from "@/lib/message-auth-live"
import { parseSpfMechanisms, parseTagList } from "@/lib/message-auth-live"

interface SpfEvaluationState {
  lookups: number
  voidLookups: number
  loopDetected: boolean
  unsupported: string[]
}

interface SpfEvaluationResult {
  result: "pass" | "fail" | "softfail" | "neutral" | "none" | "permerror" | "temperror"
  explanation: string
  state: SpfEvaluationState
}

// Parsed representation of a single SPF token (mechanism with optional qualifier and CIDR).
// Modifiers (redirect=, exp=) are handled separately before calling parseSpfToken.
export interface ParsedSpfToken {
  qualifier: string   // "+", "-", "~", or "?" (always set; defaults to "+")
  mechanism: string   // lowercased mechanism name
  domainValue: string // value after ":", before first "/" (empty string if absent)
  cidr4: string       // digits after first "/", or "" if absent
  cidr6: string       // digits after second "/", or "" if absent (dual-CIDR form per RFC 7208 s5.3)
}

const DNS_PROVIDER_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Cloudflare", pattern: /cloudflare\.com\.?$/i },
  { name: "Amazon Route 53", pattern: /awsdns-\d+\.(com|net|org|co\.uk)\.?$/i },
  { name: "Google Cloud DNS", pattern: /googledomains\.com\.?$/i },
  { name: "Microsoft Azure DNS", pattern: /azure-dns\.(com|net|org|info)\.?$/i },
  { name: "DigitalOcean", pattern: /digitalocean\.com\.?$/i }
]

function normalizeTxtRecord(raw: string): string {
  const quotedParts = Array.from(raw.matchAll(/"([^"]*)"/g)).map((match) => match[1])
  if (quotedParts.length > 0) return quotedParts.join("")
  return raw.replace(/^"|"$/g, "")
}

async function dohQuery(name: string, type = "TXT"): Promise<string[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
    const response = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      next: { revalidate: 300 }
    })
    if (!response.ok) return []
    const data = await response.json()
    return (data.Answer ?? []).map((answer: { data: string }) => answer.data)
  } catch {
    return []
  }
}

async function getTxtRecords(name: string) {
  return (await dohQuery(name, "TXT")).map(normalizeTxtRecord)
}

function toCheck(status: CheckStatus, label: string, message: string): LiveCheck {
  return { status, label, message }
}

function isIpv4InCidr(ip: string, cidr: string) {
  const [base, rawPrefix] = cidr.split("/")
  const prefix = Number.parseInt(rawPrefix ?? "32", 10)
  if (isIP(ip) !== 4 || isIP(base) !== 4 || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const ipInt = ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0) >>> 0
  const baseInt = base.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0) >>> 0
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

function expandIpv6(ip: string): string[] | null {
  if (isIP(ip) !== 6) return null

  const [headRaw, tailRaw] = ip.toLowerCase().split("::")
  const head = headRaw ? headRaw.split(":").filter(Boolean) : []
  const tail = tailRaw ? tailRaw.split(":").filter(Boolean) : []
  const missing = 8 - (head.length + tail.length)

  if (missing < 0) return null

  const expanded = [
    ...head,
    ...Array.from({ length: missing }, () => "0"),
    ...tail
  ].map((segment) => segment.padStart(4, "0"))

  return expanded.length === 8 ? expanded : null
}

export function isIpv6InCidr(ip: string, cidr: string) {
  const [base, rawPrefix] = cidr.split("/")
  const prefix = Number.parseInt(rawPrefix ?? "128", 10)
  const expandedIp = expandIpv6(ip)
  const expandedBase = expandIpv6(base)

  if (!expandedIp || !expandedBase || Number.isNaN(prefix) || prefix < 0 || prefix > 128) {
    return false
  }

  const ipBinary = expandedIp.map((segment) => Number.parseInt(segment, 16).toString(2).padStart(16, "0")).join("")
  const baseBinary = expandedBase.map((segment) => Number.parseInt(segment, 16).toString(2).padStart(16, "0")).join("")

  return ipBinary.slice(0, prefix) === baseBinary.slice(0, prefix)
}

export function isIpInCidr(ip: string, cidr: string) {
  const family = isIP(ip)
  if (family === 4) return isIpv4InCidr(ip, cidr)
  if (family === 6) return isIpv6InCidr(ip, cidr)
  return false
}

function qualifierToResult(qualifier: string): SpfEvaluationResult["result"] {
  switch (qualifier) {
    case "-":
      return "fail"
    case "~":
      return "softfail"
    case "?":
      return "neutral"
    default:
      return "pass"
  }
}

export function enforceSpfLookupLimit(state: SpfEvaluationState): SpfEvaluationResult | null {
  if (state.lookups > 10) {
    return {
      result: "permerror",
      explanation: `SPF evaluation exceeded the RFC 7208 limit of 10 DNS lookups (${state.lookups}).`,
      state
    }
  }

  return null
}

export function enforceSpfVoidLookupLimit(state: SpfEvaluationState): SpfEvaluationResult | null {
  if (state.voidLookups > 2) {
    return {
      result: "permerror",
      explanation: `SPF evaluation exceeded the RFC 7208 limit of 2 void DNS lookups (${state.voidLookups}).`,
      state
    }
  }
  return null
}

// Parses a single SPF mechanism token per RFC 7208 grammar.
// Valid CIDR forms: /24 (IPv4 only), //64 (IPv6 only), /24//64 (dual - note double slash).
// Does NOT handle modifiers (redirect=, exp=) - those must be checked before calling this.
export function parseSpfToken(token: string): ParsedSpfToken | null {
  let i = 0

  const qualifier = "+-~?".includes(token[0]) ? token[0] : "+"
  if ("+-~?".includes(token[0])) i = 1

  // Mechanism name: letters and digits, must start with a letter
  const mechStart = i
  while (i < token.length && /[a-z0-9]/i.test(token[i])) i++
  if (i === mechStart) return null
  const mechanism = token.slice(mechStart, i).toLowerCase()

  // Optional domain value after ":"
  let domainValue = ""
  if (i < token.length && token[i] === ":") {
    i++
    const start = i
    while (i < token.length && token[i] !== "/") i++
    domainValue = token.slice(start, i)
  }

  // Optional dual-cidr per RFC 7208 Section 5.3:
  //   dual-cidr-length = [ ip4-cidr-length ] [ "/" ip6-cidr-length ]
  //   ip4-cidr-length  = "/" digits  (e.g. "/24")
  //   ip6-cidr-length  = "/" digits  (e.g. "/64")
  // Combined forms: "/24" (IPv4 only), "//64" (IPv6 only), "/24//64" (dual)
  // "/24/64" with a single slash before the IPv6 length is NOT valid per RFC.
  let cidr4 = ""
  let cidr6 = ""
  if (i < token.length) {
    if (token[i] !== "/") return null // unexpected character
    i++
    if (i < token.length && token[i] === "/") {
      // "//cidr6" form - IPv6 CIDR only
      i++
      const start = i
      while (i < token.length && /\d/.test(token[i])) i++
      cidr6 = token.slice(start, i)
    } else {
      // "/cidr4" form, optionally followed by "//cidr6"
      const start = i
      while (i < token.length && /\d/.test(token[i])) i++
      cidr4 = token.slice(start, i)
      // After ip4-cidr-length, the RFC allows ["/" ip6-cidr-length] which expands to ["//digits"]
      if (i < token.length && token[i] === "/") {
        i++ // consume separator "/"
        if (i >= token.length || token[i] !== "/") return null // must be "//" not a bare "/"
        i++ // consume the leading "/" of ip6-cidr-length
        const start2 = i
        while (i < token.length && /\d/.test(token[i])) i++
        cidr6 = token.slice(start2, i)
      }
    }
  }

  if (i !== token.length) return null // unexpected trailing characters

  return { qualifier, mechanism, domainValue, cidr4, cidr6 }
}

async function evaluateSpf(domain: string, ip: string, visited = new Set<string>()): Promise<SpfEvaluationResult> {
  if (visited.has(domain)) {
    return {
      result: "permerror",
      explanation: `Recursive include/redirect loop detected at ${domain}.`,
      state: { lookups: 0, voidLookups: 0, loopDetected: true, unsupported: [] }
    }
  }

  const nextVisited = new Set(visited)
  nextVisited.add(domain)

  const txtRecords = await getTxtRecords(domain)
  const spfRecords = txtRecords.filter((record) => record.toLowerCase().startsWith("v=spf1"))

  if (spfRecords.length === 0) {
    return {
      result: "none",
      explanation: `No SPF record is currently published for ${domain}.`,
      state: { lookups: 0, voidLookups: 0, loopDetected: false, unsupported: [] }
    }
  }

  if (spfRecords.length > 1) {
    return {
      result: "permerror",
      explanation: `Multiple SPF records are published for ${domain}.`,
      state: { lookups: 0, voidLookups: 0, loopDetected: false, unsupported: [] }
    }
  }

  const record = spfRecords[0]
  const tokens = record.trim().split(/\s+/).slice(1)
  const state: SpfEvaluationState = { lookups: 0, voidLookups: 0, loopDetected: false, unsupported: [] }
  let redirectTarget: string | null = null
  const ipFamily = isIP(ip)

  for (const token of tokens) {
    // Modifiers use name=value syntax; unrecognized ones are silently ignored per RFC 7208 Section 3.1
    if (token.includes("=")) {
      const redirectMatch = token.match(/^redirect=(.+)$/i)
      if (redirectMatch) {
        redirectTarget = redirectMatch[1]
      }
      // exp= and all other modifiers: skip
      continue
    }

    const parsed = parseSpfToken(token)
    if (!parsed) {
      return {
        result: "permerror",
        explanation: `SPF token "${token}" is malformed.`,
        state
      }
    }

    const { qualifier, mechanism, domainValue } = parsed

    if (["include", "a", "mx", "exists", "ptr"].includes(mechanism)) {
      state.lookups += 1
      const lookupLimitError = enforceSpfLookupLimit(state)
      if (lookupLimitError) return lookupLimitError
    }

    if (mechanism === "ip4") {
      const cidrStr = parsed.cidr4 ? `${domainValue}/${parsed.cidr4}` : domainValue
      if (isIpInCidr(ip, cidrStr)) {
        return { result: qualifierToResult(qualifier), explanation: `Matched ip4:${cidrStr}.`, state }
      }
      continue
    }

    if (mechanism === "ip6") {
      // cidr4 slot holds the IPv6 prefix length when written as ip6:addr/cidr
      const cidrStr = parsed.cidr4 ? `${domainValue}/${parsed.cidr4}` : domainValue
      if (isIpInCidr(ip, cidrStr)) {
        return { result: qualifierToResult(qualifier), explanation: `Matched ip6:${cidrStr}.`, state }
      }
      continue
    }

    if (mechanism === "include") {
      const target = domainValue || domain
      const included = await evaluateSpf(target, ip, nextVisited)
      state.lookups += included.state.lookups
      state.voidLookups += included.state.voidLookups
      state.loopDetected ||= included.state.loopDetected
      state.unsupported.push(...included.state.unsupported)
      const lookupLimitError = enforceSpfLookupLimit(state)
      if (lookupLimitError) return lookupLimitError
      if (included.result === "pass") {
        return { result: qualifierToResult(qualifier), explanation: `Matched include:${target}.`, state }
      }
      if (["permerror", "temperror"].includes(included.result)) {
        return {
          result: included.result,
          explanation: `Included SPF evaluation for ${target} returned ${included.result}.`,
          state
        }
      }
      continue
    }

    if (mechanism === "a") {
      const host = domainValue || domain
      const [aRecords, aaaaRecords] = await Promise.all([
        dohQuery(host, "A"),
        dohQuery(host, "AAAA")
      ])
      if (aRecords.length === 0 && aaaaRecords.length === 0) {
        state.voidLookups += 1
        const voidLimitError = enforceSpfVoidLookupLimit(state)
        if (voidLimitError) return voidLimitError
      }
      // Apply CIDR matching per RFC 7208 Section 5.3; defaults to /32 (IPv4) or /128 (IPv6)
      const cidr4Len = parsed.cidr4 || "32"
      const cidr6Len = parsed.cidr6 || "128"
      const matched =
        (ipFamily === 4 && aRecords.some((addr) => isIpv4InCidr(ip, `${addr}/${cidr4Len}`))) ||
        (ipFamily === 6 && aaaaRecords.some((addr) => isIpv6InCidr(ip, `${addr}/${cidr6Len}`)))
      if (matched) {
        return { result: qualifierToResult(qualifier), explanation: `Matched A/AAAA for ${host}.`, state }
      }
      continue
    }

    if (mechanism === "mx") {
      const host = domainValue || domain
      const mxRecords = await dohQuery(host, "MX")
      const mxHosts = mxRecords
        .map((entry) => entry.trim().split(/\s+/).slice(1).join(" ").replace(/\.$/, ""))
        .filter(Boolean)
      if (mxHosts.length === 0) {
        state.voidLookups += 1
        const voidLimitError = enforceSpfVoidLookupLimit(state)
        if (voidLimitError) return voidLimitError
        continue
      }
      // Apply CIDR matching per RFC 7208 Section 5.4; defaults to /32 (IPv4) or /128 (IPv6)
      const cidr4Len = parsed.cidr4 || "32"
      const cidr6Len = parsed.cidr6 || "128"
      let matched = false
      for (const mxHost of mxHosts) {
        const [aRecords, aaaaRecords] = await Promise.all([
          dohQuery(mxHost, "A"),
          dohQuery(mxHost, "AAAA")
        ])
        if (
          (ipFamily === 4 && aRecords.some((addr) => isIpv4InCidr(ip, `${addr}/${cidr4Len}`))) ||
          (ipFamily === 6 && aaaaRecords.some((addr) => isIpv6InCidr(ip, `${addr}/${cidr6Len}`)))
        ) {
          matched = true
          break
        }
      }
      if (matched) {
        return { result: qualifierToResult(qualifier), explanation: `Matched MX host IPs for ${host}.`, state }
      }
      continue
    }

    if (mechanism === "exists") {
      const target = domainValue || domain
      const addresses = await dohQuery(target, "A")
      if (addresses.length === 0) {
        state.voidLookups += 1
        const voidLimitError = enforceSpfVoidLookupLimit(state)
        if (voidLimitError) return voidLimitError
      }
      if (addresses.length > 0) {
        return { result: qualifierToResult(qualifier), explanation: `Matched exists:${target}.`, state }
      }
      continue
    }

    if (mechanism === "all") {
      return { result: qualifierToResult(qualifier), explanation: `Reached ${qualifier}all.`, state }
    }

    if (mechanism === "ptr") {
      state.unsupported.push("ptr")
      continue
    }
  }

  // RFC 7208 Section 6.1: redirect is only evaluated when no mechanism matched AND no 'all' mechanism
  if (redirectTarget) {
    state.lookups += 1
    const lookupLimitError = enforceSpfLookupLimit(state)
    if (lookupLimitError) return lookupLimitError

    const redirected = await evaluateSpf(redirectTarget, ip, nextVisited)
    state.lookups += redirected.state.lookups
    state.voidLookups += redirected.state.voidLookups
    state.loopDetected ||= redirected.state.loopDetected
    state.unsupported.push(...redirected.state.unsupported)

    const finalLookupLimitError = enforceSpfLookupLimit(state)
    if (finalLookupLimitError) return finalLookupLimitError

    const finalVoidLimitError = enforceSpfVoidLookupLimit(state)
    if (finalVoidLimitError) return finalVoidLimitError

    return { result: redirected.result, explanation: redirected.explanation, state }
  }

  return {
    result: "neutral",
    explanation: `No SPF mechanism matched ${ip}.`,
    state
  }
}

function domainAligns(reference: string | null, candidate: string | null) {
  if (!reference || !candidate) return null
  return candidate === reference || candidate.endsWith(`.${reference}`) || reference.endsWith(`.${candidate}`)
}

function detectDnsProvider(nameserver: string | null) {
  if (!nameserver) return null
  return DNS_PROVIDER_PATTERNS.find((provider) => provider.pattern.test(nameserver))?.name ?? null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDomain = searchParams.get("from")
    if (!fromDomain) {
      return NextResponse.json({ error: "from query parameter is required" }, { status: 400 })
    }

    const context: LiveAuthLookupContext = {
      fromDomain,
      returnPathDomain: searchParams.get("returnPath"),
      spfDomain: searchParams.get("spfDomain"),
      spfClientIp: searchParams.get("ip"),
      dkimSignatures: searchParams.getAll("dkim").map((value) => {
        const [selector, domain] = value.split("@")
        return { selector, domain }
      }).filter((entry) => entry.selector && entry.domain)
    }

    const [nsRecords, dmarcTxt, spfTxt] = await Promise.all([
      dohQuery(fromDomain, "NS"),
      getTxtRecords(`_dmarc.${fromDomain}`),
      context.spfDomain ? getTxtRecords(context.spfDomain) : Promise.resolve([])
    ])

    const dmarcRecord = dmarcTxt.find((record) => record.toLowerCase().startsWith("v=dmarc1")) ?? null
    const dmarcTags = dmarcRecord ? parseTagList(dmarcRecord) : {}
    const dmarcChecks: LiveCheck[] = [
      dmarcRecord
        ? toCheck("ok", "DMARC Record Published", "DMARC record found.")
        : toCheck("problem", "DMARC Record Published", `No DMARC record found at _dmarc.${fromDomain}.`)
    ]

    if (dmarcRecord) {
      dmarcChecks.push(
        toCheck(
          dmarcTags.p === "reject" || dmarcTags.p === "quarantine" ? "ok" : "warning",
          "DMARC Policy",
          dmarcTags.p ? `Policy is ${dmarcTags.p}.` : "Policy tag p= is missing."
        )
      )
      dmarcChecks.push(
        toCheck(
          "info",
          "DMARC Alignment Mode",
          `adkim=${dmarcTags.adkim ?? "r"}, aspf=${dmarcTags.aspf ?? "r"}.`
        )
      )
    }

    const spfRecords = spfTxt.filter((record) => record.toLowerCase().startsWith("v=spf1"))
    const spfRecord = spfRecords[0] ?? null
    const spfMechanisms = spfRecord ? parseSpfMechanisms(spfRecord) : []
    const spfEvaluation =
      context.spfDomain && context.spfClientIp && isIP(context.spfClientIp)
        ? await evaluateSpf(context.spfDomain, context.spfClientIp)
        : null

    const spfChecks: LiveCheck[] = []
    if (context.spfDomain) {
      spfChecks.push(
        spfRecord
          ? toCheck("ok", "SPF Record Published", "SPF record found.")
          : toCheck("problem", "SPF Record Published", `No SPF record found for ${context.spfDomain}.`)
      )
      spfChecks.push(
        toCheck(
          spfRecords.length > 1 ? "problem" : "ok",
          "SPF Multiple Records",
          spfRecords.length > 1 ? `Found ${spfRecords.length} SPF records.` : "Less than two SPF records found."
        )
      )
      spfChecks.push(
        toCheck(
          domainAligns(fromDomain, context.spfDomain) ? "ok" : "warning",
          "SPF Alignment",
          domainAligns(fromDomain, context.spfDomain)
            ? "Envelope sender aligns with the visible From domain."
            : "Envelope sender domain differs from the visible From domain."
        )
      )
    }

    if (spfRecord) {
      const afterAll = /\ball\b(?!\s*$)/i.test(spfRecord)
      const hasPtr = /\bptr(?::|\/|\s|$)/i.test(spfRecord)
      const syntaxLooksValid = spfMechanisms.every((mechanism) => mechanism.description !== "Unrecognized SPF token")
      spfChecks.push(
        toCheck(syntaxLooksValid ? "ok" : "problem", "SPF Syntax Check", syntaxLooksValid ? "The record is valid." : "The record contains unrecognized tokens.")
      )
      spfChecks.push(
        toCheck(afterAll ? "problem" : "ok", "SPF Contains Characters After ALL", afterAll ? "Additional mechanisms were found after all." : "No items were found after all.")
      )
      spfChecks.push(
        toCheck(hasPtr ? "warning" : "ok", "SPF Type PTR Check", hasPtr ? "Deprecated ptr mechanism found." : "No ptr mechanism found.")
      )
    }

    if (spfEvaluation) {
      spfChecks.unshift(
        toCheck(
          spfEvaluation.result === "pass" ? "ok" : spfEvaluation.result === "softfail" ? "warning" : "problem",
          "SPF Authentication",
          `${spfEvaluation.result.toUpperCase()} for IP ${context.spfClientIp}. ${spfEvaluation.explanation}`
        )
      )
      spfChecks.push(
        toCheck(
          spfEvaluation.state.lookups <= 10 ? "ok" : "problem",
          "SPF Included Lookups",
          `${spfEvaluation.state.lookups} DNS lookups encountered during SPF evaluation.`
        )
      )
      spfChecks.push(
        toCheck(
          spfEvaluation.state.loopDetected ? "problem" : "ok",
          "SPF Recursive Loop",
          spfEvaluation.state.loopDetected ? "Recursive include/redirect loop detected." : "No recursive loops detected."
        )
      )
      spfChecks.push(
        toCheck(
          spfEvaluation.state.voidLookups <= 2 ? "ok" : "problem",
          "SPF Void Lookups",
          `${spfEvaluation.state.voidLookups} void lookups encountered.`
        )
      )
      if (spfEvaluation.state.unsupported.includes("ptr")) {
        spfChecks.push(
          toCheck(
            "warning",
            "SPF Unsupported Mechanism",
            "The record uses ptr, which is deprecated and not evaluated here."
          )
        )
      }
    } else if (context.spfDomain) {
      spfChecks.unshift(
        toCheck(
          "info",
          "SPF Authentication",
          "A live SPF decision needs both the envelope sender domain and the original client IP."
        )
      )
    }

    const dkim = await Promise.all(
      context.dkimSignatures.map(async (signature) => {
        const name = `${signature.selector}._domainkey.${signature.domain}`
        const records = await getTxtRecords(name)
        const record = records.find((value) => value.toLowerCase().includes("v=dkim1")) ?? null
        const tags = record ? parseTagList(record) : {}
        const revoked = record ? (tags.p ?? "").trim().length === 0 : false
        const checks: LiveCheck[] = [
          record
            ? toCheck("ok", "DKIM Record Published", "DKIM record found.")
            : toCheck("problem", "DKIM Record Published", `No DKIM record found at ${name}.`),
          toCheck(
            record && tags.v?.toUpperCase() === "DKIM1" ? "ok" : record ? "warning" : "info",
            "DKIM Syntax Check",
            record ? "The record shape looks valid." : "No record was available to validate."
          ),
          toCheck(
            revoked ? "problem" : "ok",
            "DKIM Public Key Check",
            revoked ? "Public key is empty or revoked." : "Public key is present."
          ),
          toCheck(
            domainAligns(fromDomain, signature.domain) ? "ok" : "warning",
            "DKIM Signature Alignment",
            domainAligns(fromDomain, signature.domain)
              ? "Signing domain aligns with the visible From domain."
              : "Signing domain differs from the visible From domain."
          )
        ]

        return {
          domain: signature.domain,
          selector: signature.selector,
          record,
          tags: {
            v: tags.v ?? null,
            p: tags.p ?? null,
            k: tags.k ?? null
          },
          checks
        }
      })
    )

    const payload: LiveAuthVerificationResponse = {
      context,
      dnsProvider: {
        name: detectDnsProvider(nsRecords[0] ?? null),
        nameserver: nsRecords[0] ?? null
      },
      dmarc: {
        domain: fromDomain,
        record: dmarcRecord,
        tags: {
          p: dmarcTags.p ?? null,
          sp: dmarcTags.sp ?? null,
          adkim: dmarcTags.adkim ?? null,
          aspf: dmarcTags.aspf ?? null,
          pct: dmarcTags.pct ? Number.parseInt(dmarcTags.pct, 10) : null,
          rua: dmarcTags.rua ? dmarcTags.rua.split(",").map((item) => item.trim()).filter(Boolean) : [],
          ruf: dmarcTags.ruf ? dmarcTags.ruf.split(",").map((item) => item.trim()).filter(Boolean) : []
        },
        checks: dmarcChecks
      },
      spf: context.spfDomain ? {
        domain: context.spfDomain,
        clientIp: context.spfClientIp,
        record: spfRecord,
        recordsFound: spfRecords.length,
        evaluation: spfEvaluation ? { result: spfEvaluation.result, explanation: spfEvaluation.explanation } : null,
        mechanisms: spfMechanisms,
        checks: spfChecks
      } : null,
      dkim,
      checkedAt: new Date().toISOString()
    }

    return NextResponse.json(payload, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } })
  } catch (error) {
    return captureAPIError(error, request, 500, { operation: "message_header_live_auth" })
  }
}
