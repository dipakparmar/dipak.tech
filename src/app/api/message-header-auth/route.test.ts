import { describe, expect, test } from "bun:test"
import { enforceSpfLookupLimit, isIpInCidr } from "./route"

describe("message-header-auth SPF helpers", () => {
  test("matches IPv6 addresses against ip6 CIDR ranges", () => {
    expect(isIpInCidr("2001:db8::1", "2001:db8::/32")).toBe(true)
    expect(isIpInCidr("2001:db9::1", "2001:db8::/32")).toBe(false)
  })

  test("returns permerror once SPF lookup budget exceeds ten", () => {
    expect(
      enforceSpfLookupLimit({
        lookups: 11,
        voidLookups: 0,
        loopDetected: false,
        unsupported: []
      })
    ).toMatchObject({
      result: "permerror"
    })

    expect(
      enforceSpfLookupLimit({
        lookups: 10,
        voidLookups: 0,
        loopDetected: false,
        unsupported: []
      })
    ).toBeNull()
  })
})
