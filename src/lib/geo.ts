import { headers } from "next/headers"

export interface DetectedGeo {
  country: string | null
  region: string | null
  city: string | null
  timezone: string | null
}

/**
 * Reads geo-location from request headers.
 * Prefers Vercel headers, falls back to Cloudflare headers.
 * Must be called from a Server Component or Route Handler.
 */
export async function detectGeoFromHeaders(): Promise<DetectedGeo> {
  const h = await headers()

  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    null

  const region =
    h.get("x-vercel-ip-country-region") ||
    h.get("cf-region") ||
    null

  const rawCity =
    h.get("x-vercel-ip-city") ||
    h.get("cf-city") ||
    null
  const city = rawCity ? decodeURIComponent(rawCity) : null

  const timezone =
    h.get("x-vercel-ip-timezone") ||
    h.get("cf-timezone") ||
    null

  return { country, region, city, timezone }
}
