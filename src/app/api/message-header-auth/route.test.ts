import { describe, expect, test } from "bun:test"
import { enforceSpfLookupLimit, enforceSpfVoidLookupLimit, isIpInCidr, parseSpfToken } from "./route"

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
    ).toMatchObject({ result: "permerror" })

    expect(
      enforceSpfLookupLimit({
        lookups: 10,
        voidLookups: 0,
        loopDetected: false,
        unsupported: []
      })
    ).toBeNull()
  })

  test("returns permerror once void lookup count exceeds two", () => {
    expect(
      enforceSpfVoidLookupLimit({
        lookups: 0,
        voidLookups: 3,
        loopDetected: false,
        unsupported: []
      })
    ).toMatchObject({ result: "permerror" })

    expect(
      enforceSpfVoidLookupLimit({
        lookups: 0,
        voidLookups: 2,
        loopDetected: false,
        unsupported: []
      })
    ).toBeNull()
  })
})

describe("parseSpfToken", () => {
  test("parses simple mechanisms without qualifier or value", () => {
    expect(parseSpfToken("all")).toMatchObject({ qualifier: "+", mechanism: "all", domainValue: "", cidr4: "", cidr6: "" })
    expect(parseSpfToken("mx")).toMatchObject({ qualifier: "+", mechanism: "mx", domainValue: "" })
  })

  test("parses qualifiers correctly", () => {
    expect(parseSpfToken("-all")).toMatchObject({ qualifier: "-", mechanism: "all" })
    expect(parseSpfToken("~all")).toMatchObject({ qualifier: "~", mechanism: "all" })
    expect(parseSpfToken("?all")).toMatchObject({ qualifier: "?", mechanism: "all" })
    expect(parseSpfToken("+all")).toMatchObject({ qualifier: "+", mechanism: "all" })
  })

  test("parses mechanism with domain value", () => {
    expect(parseSpfToken("include:_spf.google.com")).toMatchObject({
      qualifier: "+",
      mechanism: "include",
      domainValue: "_spf.google.com",
      cidr4: "",
      cidr6: ""
    })
  })

  test("parses ip4 with CIDR notation", () => {
    expect(parseSpfToken("ip4:192.0.2.0/24")).toMatchObject({
      mechanism: "ip4",
      domainValue: "192.0.2.0",
      cidr4: "24",
      cidr6: ""
    })
  })

  test("parses ip4 without CIDR (exact match)", () => {
    expect(parseSpfToken("ip4:192.0.2.1")).toMatchObject({
      mechanism: "ip4",
      domainValue: "192.0.2.1",
      cidr4: "",
      cidr6: ""
    })
  })

  test("parses ip6 with CIDR notation", () => {
    expect(parseSpfToken("ip6:2001:db8::/32")).toMatchObject({
      mechanism: "ip6",
      domainValue: "2001:db8::",
      cidr4: "32",
      cidr6: ""
    })
  })

  test("parses a with IPv4 CIDR only (RFC 7208 Section 5.3 a/cidr4 form)", () => {
    expect(parseSpfToken("a/24")).toMatchObject({
      mechanism: "a",
      domainValue: "",
      cidr4: "24",
      cidr6: ""
    })
  })

  test("parses a with IPv6 CIDR only using double-slash form (RFC 7208 Section 5.3)", () => {
    expect(parseSpfToken("a//64")).toMatchObject({
      mechanism: "a",
      domainValue: "",
      cidr4: "",
      cidr6: "64"
    })
  })

  test("parses a with domain and dual CIDR using RFC 7208 //cidr6 form", () => {
    // RFC 7208 Section 5.3: dual-cidr-length = [ip4-cidr-length] ["/" ip6-cidr-length]
    // ip6-cidr-length itself starts with "/", so combined form is /24//64, not /24/64
    expect(parseSpfToken("a:example.com/24//64")).toMatchObject({
      mechanism: "a",
      domainValue: "example.com",
      cidr4: "24",
      cidr6: "64"
    })
  })

  test("parses mx with dual CIDR using RFC 7208 //cidr6 form", () => {
    expect(parseSpfToken("mx:example.com/24//64")).toMatchObject({
      mechanism: "mx",
      domainValue: "example.com",
      cidr4: "24",
      cidr6: "64"
    })
  })

  test("returns null for malformed tokens", () => {
    expect(parseSpfToken("")).toBeNull()
    expect(parseSpfToken("a:dom/bad")).toBeNull()     // non-digit after /
    expect(parseSpfToken("a:dom/24extra")).toBeNull() // trailing chars
    expect(parseSpfToken("a:dom/24/64")).toBeNull()   // single slash before IPv6 CIDR - invalid per RFC 7208
  })

  test("does not parse modifiers (those must be checked before calling)", () => {
    // redirect= contains '=' which is not a mechanism character after the name
    expect(parseSpfToken("redirect=other.com")).toBeNull()
  })
})
