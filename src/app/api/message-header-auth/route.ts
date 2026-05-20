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

async function resolveAddresses(host: string) {
  const [a, aaaa] = await Promise.all([dohQuery(host, "A"), dohQuery(host, "AAAA")])
  return [...a, ...aaaa]
}

async function resolveMxAddresses(domain: string) {
  const mxRecords = await dohQuery(domain, "MX")
  const hosts = mxRecords
    .map((entry) => entry.trim().split(/\s+/).slice(1).join(" ").replace(/\.$/, ""))
    .filter(Boolean)

  const addresses = await Promise.all(hosts.map((host) => resolveAddresses(host)))
  return addresses.flat()
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

  for (const token of tokens) {
    const redirectMatch = token.match(/^redirect=(.+)$/i)
    if (redirectMatch) {
      redirectTarget = redirectMatch[1]
      continue
    }

    const expMatch = token.match(/^exp=(.+)$/i)
    if (expMatch) continue

    const match = token.match(/^([+?~-]?)([a-z0-9]+)(?::([^/]+(?:\/[^/]+)?))?$/i)
    if (!match) {
      return {
        result: "permerror",
        explanation: `SPF token "${token}" is malformed.`,
        state
      }
    }

    const [, qualifier = "", mechanismRaw, valueRaw = ""] = match
    const mechanism = mechanismRaw.toLowerCase()
    const target = valueRaw || domain

    if (["include", "a", "mx", "exists", "ptr"].includes(mechanism)) {
      state.lookups += 1
      const lookupLimitError = enforceSpfLookupLimit(state)
      if (lookupLimitError) return lookupLimitError
    }

    if (mechanism === "ip4" && isIpInCidr(ip, target)) {
      return { result: qualifierToResult(qualifier), explanation: `Matched ip4:${target}.`, state }
    }

    if (mechanism === "ip6" && isIpInCidr(ip, target)) {
      return { result: qualifierToResult(qualifier), explanation: `Matched ip6:${target}.`, state }
    }

    if (mechanism === "include") {
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
      const addresses = await resolveAddresses(target)
      if (addresses.length === 0) state.voidLookups += 1
      if (addresses.includes(ip)) {
        return { result: qualifierToResult(qualifier), explanation: `Matched A/AAAA for ${target}.`, state }
      }
      continue
    }

    if (mechanism === "mx") {
      const addresses = await resolveMxAddresses(target)
      if (addresses.length === 0) state.voidLookups += 1
      if (addresses.includes(ip)) {
        return { result: qualifierToResult(qualifier), explanation: `Matched MX host IPs for ${target}.`, state }
      }
      continue
    }

    if (mechanism === "exists") {
      const addresses = await dohQuery(target, "A")
      if (addresses.length === 0) state.voidLookups += 1
      if (addresses.length > 0) {
        return { result: qualifierToResult(qualifier), explanation: `Matched exists:${target}.`, state }
      }
      continue
    }

    if (mechanism === "all") {
      return { result: qualifierToResult(qualifier), explanation: `Reached ${qualifier || "+"}all.`, state }
    }

    if (mechanism === "ptr") {
      state.unsupported.push("ptr")
      continue
    }
  }

  if (redirectTarget) {
    const redirected = await evaluateSpf(redirectTarget, ip, nextVisited)
    redirected.state.lookups += 1
    const lookupLimitError = enforceSpfLookupLimit(redirected.state)
    if (lookupLimitError) return lookupLimitError
    return redirected
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
