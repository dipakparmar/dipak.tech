import type { EmailSecurityResult } from "./osint-types"

function stripTxtQuotes(r: string): string {
  return r.startsWith('"') && r.endsWith('"') ? r.slice(1, -1) : r
}

// Parse tokens to find the 'all' qualifier, avoiding substring false-positives
// (e.g. "include:example-alliance.net" contains "-all" as a substring but has no 'all' mechanism)
function detectAllQualifier(record: string): string | null {
  const tokens = record.trim().split(/\s+/).slice(1)
  for (const token of tokens) {
    const m = token.match(/^([+?~-]?)all$/i)
    if (m) return m[1] || "+"
  }
  return null
}

export function parseEmailSecurity(txtRecords: string[]): EmailSecurityResult {
  const records = txtRecords.map(stripTxtQuotes)
  const spfRecord = records.find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null

  const allQualifier = spfRecord ? detectAllQualifier(spfRecord) : null
  const spfPolicy: EmailSecurityResult["spf"]["policy"] = !spfRecord
    ? "none"
    : allQualifier === "-"
      ? "fail"
      : allQualifier === "~"
        ? "softfail"
        : allQualifier === "?"
          ? "neutral"
          : allQualifier === "+"
            ? "pass"
            : "neutral" // record present but no 'all' terminator

  const dmarcRecord = records.find((r) => r.startsWith("v=DMARC1")) ?? null
  const dmarcPolicyRaw = dmarcRecord?.match(/p=(none|quarantine|reject)/)?.[1]
  const dmarcPolicyMap: Record<string, EmailSecurityResult["dmarc"]["policy"]> = {
    none: "none",
    quarantine: "quarantine",
    reject: "reject",
  }
  const dmarcPct = parseInt(dmarcRecord?.match(/pct=(\d+)/)?.[1] ?? "100", 10)

  const bimiRecord = records.find((r) => r.startsWith("v=BIMI1")) ?? null

  return {
    spf: {
      record: spfRecord,
      policy: spfPolicy,
    },
    dmarc: {
      record: dmarcRecord,
      policy: dmarcPolicyMap[dmarcPolicyRaw ?? ""] ?? "none",
      reporting: dmarcRecord?.includes("rua=") ?? false,
      pct: isNaN(dmarcPct) ? 100 : dmarcPct,
    },
    bimi: {
      present: bimiRecord !== null,
      record: bimiRecord,
    },
  }
}
