import type { EmailSecurityResult } from "./osint-types"

function stripTxtQuotes(r: string): string {
  return r.startsWith('"') && r.endsWith('"') ? r.slice(1, -1) : r
}

export function parseEmailSecurity(txtRecords: string[]): EmailSecurityResult {
  const records = txtRecords.map(stripTxtQuotes)
  const spfRecord = records.find((r) => r.startsWith("v=spf1")) ?? null
  const spfPolicy: EmailSecurityResult["spf"]["policy"] = spfRecord?.includes("-all")
    ? "fail"
    : spfRecord?.includes("~all")
      ? "softfail"
      : spfRecord?.includes("?all")
        ? "neutral"
        : spfRecord
          ? // +all and bare 'all' have no "pass" variant in the policy union; treat as neutral (permissive but not specifically harmful)
            "neutral"
          : "none"

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
