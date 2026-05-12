import { describe, expect, test } from "bun:test"
import { detectProviderHeaders, getProviderHeaderGuide } from "./provider-headers"

describe("provider header detection", () => {
  test("detects SendGrid headers", () => {
    const matches = detectProviderHeaders([
      { name: "X-SG-ID", value: "abc123" },
      { name: "X-SMTPAPI", value: '{"category":"welcome"}' }
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.providerId).toBe("sendgrid")
    expect(matches[0]?.matchedHeaders).toHaveLength(2)
  })

  test("detects Postmark metadata prefix headers", () => {
    const matches = detectProviderHeaders([
      { name: "X-PM-Metadata-user-id", value: "42" }
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.providerId).toBe("postmark")
  })

  test("detects Mailchimp from X-Mailer value", () => {
    const matches = detectProviderHeaders([
      { name: "X-Mailer", value: "MailChimp Mailer - CID123456" }
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.providerId).toBe("mailchimp")
  })

  test("returns row-level guide for prefixed provider headers", () => {
    const guide = getProviderHeaderGuide("X-PM-Metadata-account-id")

    expect(guide?.title).toBe("X-PM-Metadata-*")
  })

  test("does not return Mailchimp guide for a generic X-Mailer value", () => {
    const guide = getProviderHeaderGuide("X-Mailer", "Microsoft Outlook 16.0")

    expect(guide).toBeUndefined()
  })

  test("detects Salesforce core headers", () => {
    const matches = detectProviderHeaders([
      { name: "X-SFDC-LK", value: "00DA0000000KLks" },
      { name: "X-SFDC-TLS-STATUS", value: "true" },
      { name: "X-SFDC-X-Customer", value: "vip" }
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.providerId).toBe("salesforce-core")
    expect(matches[0]?.matchedHeaders).toHaveLength(3)
  })

  test("detects SFMC from stack header", () => {
    const matches = detectProviderHeaders([
      { name: "X-SFMC-Stack", value: "S1" }
    ])

    expect(matches).toHaveLength(1)
    expect(matches[0]?.providerId).toBe("sfmc")
  })

  test("returns row-level guide for Salesforce custom header prefix", () => {
    const guide = getProviderHeaderGuide("X-SFDC-X-Trace-Id")

    expect(guide?.title).toBe("X-SFDC-X-*")
  })

  test("does not return Salesforce Sender guide for a non-Salesforce sender value", () => {
    const guide = getProviderHeaderGuide("Sender", "alerts@example.com")

    expect(guide).toBeUndefined()
  })

  test("returns Salesforce official references when available", () => {
    const guide = getProviderHeaderGuide("X-SFDC-LK", "00DA0000000KLks")

    expect(guide?.references?.length).toBeGreaterThan(0)
    expect(guide?.references?.[0]?.url).toContain("salesforce.com")
  })
})
