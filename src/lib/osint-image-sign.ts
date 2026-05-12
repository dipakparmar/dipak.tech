const SECRET = process.env.OG_SECRET ?? ""

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

function hasSigningSecret(): boolean {
  return SECRET.length > 0
}

export type ImageUrlSignatureInput = {
  url: string
  clientId: string
  nonce: string
  expiresAt: number
}

export type ImageUrlSignature = ImageUrlSignatureInput & {
  token: string
}

export function buildImageUrlSignaturePayload({
  url,
  clientId,
  nonce,
  expiresAt
}: ImageUrlSignatureInput): string {
  return [
    `url=${url}`,
    `client=${clientId}`,
    `nonce=${nonce}`,
    `exp=${expiresAt}`
  ].join("|")
}

export async function signImageUrl(
  input: ImageUrlSignatureInput
): Promise<ImageUrlSignature | null> {
  if (!hasSigningSecret()) return null

  const key = await importKey(SECRET)
  const payload = buildImageUrlSignaturePayload(input)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return {
    ...input,
    token: Buffer.from(sig).toString("hex")
  }
}

export async function verifyImageUrl(
  input: ImageUrlSignatureInput,
  token: string
): Promise<boolean> {
  try {
    if (!hasSigningSecret() || Date.now() > input.expiresAt) {
      return false
    }

    const key = await importKey(SECRET)
    const expected = Buffer.from(token, "hex")
    const payload = buildImageUrlSignaturePayload(input)
    return crypto.subtle.verify("HMAC", key, expected, new TextEncoder().encode(payload))
  } catch {
    return false
  }
}
