import { beforeAll, describe, expect, test } from "bun:test"

let buildImageUrlSignaturePayload: typeof import("./osint-image-sign").buildImageUrlSignaturePayload
let signImageUrl: typeof import("./osint-image-sign").signImageUrl
let verifyImageUrl: typeof import("./osint-image-sign").verifyImageUrl

beforeAll(async () => {
  process.env.OG_SECRET = "test-og-secret"
  ;({ buildImageUrlSignaturePayload, signImageUrl, verifyImageUrl } = await import("./osint-image-sign"))
})

describe("osint image signing", () => {
  test("builds a stable payload", () => {
    expect(
      buildImageUrlSignaturePayload({
        url: "https://example.com/image.png",
        clientId: "203.0.113.10",
        nonce: "abc123",
        expiresAt: 1234567890
      })
    ).toBe(
      "url=https://example.com/image.png|client=203.0.113.10|nonce=abc123|exp=1234567890"
    )
  })

  test("accepts a valid signature for the same client", async () => {
    const signature = await signImageUrl({
      url: "https://example.com/image.png",
      clientId: "203.0.113.10",
      nonce: "nonce-1",
      expiresAt: Date.now() + 60_000
    })

    expect(signature).not.toBeNull()
    expect(
      await verifyImageUrl(
        {
          url: "https://example.com/image.png",
          clientId: "203.0.113.10",
          nonce: "nonce-1",
          expiresAt: signature!.expiresAt
        },
        signature!.token
      )
    ).toBe(true)
  })

  test("rejects reuse from a different client", async () => {
    const signature = await signImageUrl({
      url: "https://example.com/image.png",
      clientId: "203.0.113.10",
      nonce: "nonce-2",
      expiresAt: Date.now() + 60_000
    })

    expect(signature).not.toBeNull()
    expect(
      await verifyImageUrl(
        {
          url: "https://example.com/image.png",
          clientId: "198.51.100.20",
          nonce: "nonce-2",
          expiresAt: signature!.expiresAt
        },
        signature!.token
      )
    ).toBe(false)
  })

  test("rejects expired signatures", async () => {
    const signature = await signImageUrl({
      url: "https://example.com/image.png",
      clientId: "203.0.113.10",
      nonce: "nonce-3",
      expiresAt: Date.now() - 1_000
    })

    expect(signature).not.toBeNull()
    expect(
      await verifyImageUrl(
        {
          url: "https://example.com/image.png",
          clientId: "203.0.113.10",
          nonce: "nonce-3",
          expiresAt: signature!.expiresAt
        },
        signature!.token
      )
    ).toBe(false)
  })
})
