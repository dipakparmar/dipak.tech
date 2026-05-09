// src/lib/email-security.ts
import type { EmailSecurityResult } from "./osint-types"

export function parseEmailSecurity(txtRecords: string[]): EmailSecurityResult {
  const spfRecord = txtRecords.find((r) => r.startsWith("v=spf1")) ?? null
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

  const dmarcRecord = txtRecords.find((r) => r.startsWith("v=DMARC1")) ?? null
  const dmarcPolicyRaw = dmarcRecord?.match(/p=(none|quarantine|reject)/)?.[1]
  const dmarcPolicyMap: Record<string, EmailSecurityResult["dmarc"]["policy"]> = {
    none: "none",
    quarantine: "quarantine",
    reject: "reject",
  }
  const dmarcPct = parseInt(dmarcRecord?.match(/pct=(\d+)/)?.[1] ?? "100", 10)

  const bimiRecord = txtRecords.find((r) => r.startsWith("v=BIMI1")) ?? null

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
