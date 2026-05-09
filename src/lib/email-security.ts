// src/lib/email-security.ts
import type { EmailSecurityResult } from "./osint-types"

export function parseEmailSecurity(txtRecords: string[]): EmailSecurityResult {
  const spfRecord = txtRecords.find((r) => r.startsWith("v=spf1")) ?? null
  const spfPolicy = spfRecord?.includes("-all")
    ? "fail"
    : spfRecord?.includes("~all")
      ? "softfail"
      : spfRecord?.includes("?all")
        ? "neutral"
        : spfRecord
          ? "neutral"
          : "none"

  const dmarcRecord = txtRecords.find((r) => r.startsWith("v=DMARC1")) ?? null
  const dmarcPolicyMatch = dmarcRecord?.match(/p=(none|quarantine|reject)/)
  const dmarcPct = parseInt(dmarcRecord?.match(/pct=(\d+)/)?.[1] ?? "100", 10)

  const bimiRecord = txtRecords.find((r) => r.startsWith("v=BIMI1")) ?? null

  return {
    spf: {
      record: spfRecord,
      policy: (spfPolicy) as EmailSecurityResult["spf"]["policy"],
    },
    dmarc: {
      record: dmarcRecord,
      policy: (dmarcPolicyMatch?.[1] ?? "none") as EmailSecurityResult["dmarc"]["policy"],
      reporting: dmarcRecord?.includes("rua=") ?? false,
      pct: isNaN(dmarcPct) ? 100 : dmarcPct,
    },
    bimi: {
      present: bimiRecord !== null,
      record: bimiRecord,
    },
  }
}
