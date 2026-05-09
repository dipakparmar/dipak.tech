import { describe, test, expect } from "bun:test"
import { detectWAF } from "./waf-detector"

describe("detectWAF", () => {
  test("detects Cloudflare from cf-ray header", () => {
    const result = detectWAF({ "cf-ray": "abc123-LHR", "server": "cloudflare" })
    expect(result.detected).toBe(true)
    expect(result.name).toBe("Cloudflare")
    expect(result.capabilities).toContain("CDN")
  })

  test("detects AWS CloudFront", () => {
    const result = detectWAF({ "x-amz-cf-id": "abc123", "via": "1.1 cloudfront.net" })
    expect(result.detected).toBe(true)
    expect(result.name).toBe("AWS CloudFront")
  })

  test("detects Fastly", () => {
    const result = detectWAF({ "x-served-by": "cache-lhr-egll1234-LHR", "x-cache": "HIT" })
    expect(result.detected).toBe(true)
    expect(result.name).toBe("Fastly")
  })

  test("returns not detected for unknown headers", () => {
    const result = detectWAF({ "server": "nginx", "content-type": "text/html" })
    expect(result.detected).toBe(false)
    expect(result.name).toBeNull()
  })
})
