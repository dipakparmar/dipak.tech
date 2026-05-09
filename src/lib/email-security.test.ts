// src/lib/email-security.test.ts
import { describe, test, expect } from "bun:test"
import { parseEmailSecurity } from "./email-security"

describe("parseEmailSecurity", () => {
  test("parses SPF with -all policy", () => {
    const result = parseEmailSecurity(["v=spf1 include:_spf.google.com -all"])
    expect(result.spf.policy).toBe("fail")
    expect(result.spf.record).toBe("v=spf1 include:_spf.google.com -all")
  })

  test("parses SPF with ~all policy", () => {
    const result = parseEmailSecurity(["v=spf1 include:sendgrid.net ~all"])
    expect(result.spf.policy).toBe("softfail")
  })

  test("parses DMARC p=reject", () => {
    const result = parseEmailSecurity([
      "v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100",
    ])
    expect(result.dmarc.policy).toBe("reject")
    expect(result.dmarc.reporting).toBe(true)
    expect(result.dmarc.pct).toBe(100)
  })

  test("returns none when no SPF record", () => {
    const result = parseEmailSecurity(["v=DMARC1; p=none"])
    expect(result.spf.policy).toBe("none")
    expect(result.spf.record).toBeNull()
  })

  test("detects BIMI record", () => {
    const result = parseEmailSecurity(["v=BIMI1; l=https://example.com/logo.svg"])
    expect(result.bimi.present).toBe(true)
  })

  test("defaults pct to 100 when tag is absent", () => {
    const result = parseEmailSecurity(["v=DMARC1; p=quarantine; rua=mailto:x@example.com"])
    expect(result.dmarc.pct).toBe(100)
  })

  test("returns all nulls/none/false for empty array", () => {
    const result = parseEmailSecurity([])
    expect(result.spf.record).toBeNull()
    expect(result.spf.policy).toBe("none")
    expect(result.dmarc.record).toBeNull()
    expect(result.bimi.present).toBe(false)
  })
})
