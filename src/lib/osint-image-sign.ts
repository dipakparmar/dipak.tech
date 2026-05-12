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

async function signText(payload: string): Promise<string> {
  const key = await importKey(SECRET)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return Buffer.from(sig).toString("hex")
}

async function verifyText(payload: string, token: string): Promise<boolean> {
  try {
    const key = await importKey(SECRET)
    const expected = Buffer.from(token, "hex")
    return crypto.subtle.verify("HMAC", key, expected, new TextEncoder().encode(payload))
  } catch {
    return false
  }
}

export type ProviderLogoSignatureInput = {
  provider: string
  theme: string | null
  clientId: string
  nonce: string
  expiresAt: number
}

export type ProviderLogoSignature = ProviderLogoSignatureInput & {
  token: string
}

export function buildProviderLogoSignaturePayload({
  provider,
  theme,
  clientId,
  nonce,
  expiresAt
}: ProviderLogoSignatureInput): string {
  return [
    `provider=${provider}`,
    `theme=${theme ?? ""}`,
    `client=${clientId}`,
    `nonce=${nonce}`,
    `exp=${expiresAt}`
  ].join("|")
}

export async function signProviderLogoSignature(
  input: ProviderLogoSignatureInput
): Promise<ProviderLogoSignature> {
  const payload = buildProviderLogoSignaturePayload(input)
  return {
    ...input,
    token: await signText(payload)
  }
}

export async function verifyProviderLogoSignature(
  input: ProviderLogoSignatureInput,
  token: string
): Promise<boolean> {
  if (Date.now() > input.expiresAt) return false
  const payload = buildProviderLogoSignaturePayload(input)
  return verifyText(payload, token)
}
