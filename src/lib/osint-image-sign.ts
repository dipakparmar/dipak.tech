const SECRET = process.env.OG_SECRET ?? ""

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || "dev-insecure-fallback"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

export async function signImageUrl(url: string): Promise<string> {
  const key = await importKey(SECRET)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(url))
  return Buffer.from(sig).toString("hex")
}

export async function verifyImageUrl(url: string, token: string): Promise<boolean> {
  try {
    const key = await importKey(SECRET)
    const expected = Buffer.from(token, "hex")
    return crypto.subtle.verify("HMAC", key, expected, new TextEncoder().encode(url))
  } catch {
    return false
  }
}
