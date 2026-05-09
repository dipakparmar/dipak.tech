import { NextResponse } from "next/server"

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon", "image/avif"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) return NextResponse.json({ error: "url parameter is required" }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
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
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 })
  }
}
