import { NextResponse } from "next/server"
import { getClientId } from "@/lib/osint-cache"
import { getProviderLogoDomain, isProviderLogoId } from "@/lib/provider-logos"
import { signProviderLogoSignature } from "@/lib/osint-image-sign"

const LOGO_SIGNATURE_TTL_MS = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider")
  const theme = searchParams.get("theme")

  if (!provider) {
    return NextResponse.json({ error: "provider parameter is required" }, { status: 400 })
  }

  if (!isProviderLogoId(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
  }

  if (theme !== null && theme !== "light" && theme !== "dark") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 })
  }

  if (!process.env.OG_SECRET) {
    return NextResponse.json({ error: "Provider logo signing is not configured" }, { status: 503 })
  }

  const clientId = getClientId(request.headers)
  const expiresAt = Date.now() + LOGO_SIGNATURE_TTL_MS
  const nonce = crypto.randomUUID()
  const signature = await signProviderLogoSignature({
    provider: getProviderLogoDomain(provider),
    theme,
    clientId,
    nonce,
    expiresAt
  })

  const params = new URLSearchParams({
    provider,
    token: signature.token,
    exp: String(signature.expiresAt),
    nonce: signature.nonce
  })

  if (theme) {
    params.set("theme", theme)
  }

  return NextResponse.json({
    src: `/api/osint/image-proxy?${params.toString()}`,
    expiresAt: signature.expiresAt
  })
}
