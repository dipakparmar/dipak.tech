import { beforeAll, describe, expect, test } from "bun:test"

let getProviderLogoDomain: typeof import("./provider-logos").getProviderLogoDomain
let getProviderLogoSrc: typeof import("./provider-logos").getProviderLogoSrc
let isProviderLogoId: typeof import("./provider-logos").isProviderLogoId

beforeAll(async () => {
  process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN = "pk_test_logo_token"
  ;({ getProviderLogoDomain, getProviderLogoSrc, isProviderLogoId } = await import("./provider-logos"))
})

describe("provider logos", () => {
  test("allows known provider ids only", () => {
    expect(isProviderLogoId("sendgrid")).toBe(true)
    expect(isProviderLogoId("salesforce-core")).toBe(true)
    expect(isProviderLogoId("not-a-provider")).toBe(false)
  })

  test("returns the expected logo domain and proxy src", () => {
    expect(getProviderLogoDomain("mailgun")).toBe("mailgun.com")
    expect(getProviderLogoSrc("mailgun")).toBe(
      "https://img.logo.dev/mailgun.com?token=pk_test_logo_token&size=80&format=png&retina=true&fallback=404"
    )
    expect(getProviderLogoSrc("mailgun", "dark")).toBe(
      "https://img.logo.dev/mailgun.com?token=pk_test_logo_token&size=80&format=png&retina=true&fallback=404&theme=dark"
    )
    expect(getProviderLogoSrc("unknown")).toBeNull()
  })
})
