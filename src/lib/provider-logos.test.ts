import { describe, expect, test } from "bun:test"
import {
  getProviderLogoDomain,
  getProviderLogoSrc,
  isProviderLogoId
} from "./provider-logos"

describe("provider logos", () => {
  test("allows known provider ids only", () => {
    expect(isProviderLogoId("sendgrid")).toBe(true)
    expect(isProviderLogoId("salesforce-core")).toBe(true)
    expect(isProviderLogoId("not-a-provider")).toBe(false)
  })

  test("returns the expected logo domain and proxy src", () => {
    expect(getProviderLogoDomain("mailgun")).toBe("mailgun.com")
    expect(getProviderLogoSrc("mailgun")).toBe("/api/osint/image-proxy?provider=mailgun")
    expect(getProviderLogoSrc("mailgun", "dark")).toBe(
      "/api/osint/image-proxy?provider=mailgun&theme=dark"
    )
    expect(getProviderLogoSrc("unknown")).toBeNull()
  })
})
