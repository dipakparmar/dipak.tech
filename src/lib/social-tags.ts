import type { SocialTagsResult } from "./osint-types"

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'",
}

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39|#x27);/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m)
}

function getMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeEntities(match[1].trim())
  }
  return null
}

export function parseSocialTags(html: string): SocialTagsResult {
  return {
    og: {
      title: getMeta(html, "og:title"),
      description: getMeta(html, "og:description"),
      image: getMeta(html, "og:image"),
      type: getMeta(html, "og:type"),
      siteName: getMeta(html, "og:site_name"),
    },
    twitter: {
      card: getMeta(html, "twitter:card"),
      site: getMeta(html, "twitter:site"),
      creator: getMeta(html, "twitter:creator"),
    },
  }
}
