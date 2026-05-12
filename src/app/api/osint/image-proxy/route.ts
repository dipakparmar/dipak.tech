import { NextResponse } from "next/server"
import { verifyImageUrl } from "@/lib/osint-image-sign"
import { getProviderLogoDomain, isProviderLogoId } from "@/lib/provider-logos"

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon", "image/avif"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_LOGO_THEMES = new Set(["light", "dark"])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  const provider = searchParams.get("provider")
  const theme = searchParams.get("theme")
  const token = searchParams.get("token")

  let parsed: URL

  if (provider) {
    if (!isProviderLogoId(provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
    }

    const logoSecret = process.env.LOGO_DEV_SECRET
    if (!logoSecret) {
      return NextResponse.json({ error: "Provider logo support is not configured" }, { status: 503 })
    }

    parsed = new URL(`https://img.logo.dev/${getProviderLogoDomain(provider)}`)
    parsed.searchParams.set("token", logoSecret)
    parsed.searchParams.set("size", "80")
    parsed.searchParams.set("format", "png")
    parsed.searchParams.set("retina", "true")
    parsed.searchParams.set("fallback", "404")

    if (theme && ALLOWED_LOGO_THEMES.has(theme)) {
      parsed.searchParams.set("theme", theme)
    }
  } else {
    if (!url || !token) {
      return NextResponse.json({ error: "url and token parameters are required" }, { status: 400 })
    }

    const valid = await verifyImageUrl(url, token)
    if (!valid) return NextResponse.json({ error: "Invalid token" }, { status: 403 })

    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 8000)

    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "dipak.tech-osint/1.0" },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 })
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? ""
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 })
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": provider ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 })
  }
}
