import type { TechStackResult } from "./osint-types"

export function detectTechStack(
  headers: Record<string, string>,
  html: string
): TechStackResult {
  const result: TechStackResult = { cdn: [], framework: [], cms: [], analytics: [], server: [] }
  const h = (k: string) => headers[k.toLowerCase()] ?? ""

  // CDN / Hosting
  if (h("cf-ray") || h("server").includes("cloudflare")) result.cdn.push("Cloudflare")
  if (h("x-vercel-id") || h("x-vercel-cache")) result.cdn.push("Vercel")
  if (h("x-amz-cf-id") || h("via").includes("cloudfront")) result.cdn.push("AWS CloudFront")
  if (h("x-served-by") || h("fastly-restarts")) result.cdn.push("Fastly")
  if (h("x-github-request-id")) result.cdn.push("GitHub Pages")
  if (h("x-netlify-cache") || h("x-nf-request-id")) result.cdn.push("Netlify")

  // Server
  const server = h("server")
  if (server.includes("nginx")) result.server.push("nginx")
  else if (server.includes("apache")) result.server.push("Apache")
  else if (server.includes("caddy")) result.server.push("Caddy")
  else if (server.includes("iis")) result.server.push("IIS")

  const poweredBy = h("x-powered-by")
  if (poweredBy.includes("next.js")) result.framework.push("Next.js")
  else if (poweredBy.includes("express")) result.server.push("Express")
  else if (poweredBy.includes("php")) result.server.push("PHP")

  // Framework — HTML patterns
  if (html.includes("/_next/static/") || html.includes("__NEXT_DATA__")) {
    if (!result.framework.includes("Next.js")) result.framework.push("Next.js")
  }
  if (html.includes("/wp-content/") || html.includes("/wp-includes/")) result.cms.push("WordPress")
  if (html.includes("gatsby-")) result.framework.push("Gatsby")
  if (html.includes("__nuxt") || html.includes("/_nuxt/")) result.framework.push("Nuxt")
  if (html.includes("data-astro-") || html.includes("/_astro/")) result.framework.push("Astro")
  if (html.includes("ng-version=") || html.includes("ng-app")) result.framework.push("Angular")
  if (html.includes("data-reactroot") || html.includes("react-dom")) {
    if (!result.framework.some((f) => ["Next.js", "Gatsby", "Nuxt"].includes(f))) {
      result.framework.push("React")
    }
  }

  // CMS — x-generator header + meta generator tag
  const xGenerator = h("x-generator").toLowerCase()
  if (xGenerator.includes("wordpress")) result.cms.push("WordPress")
  else if (xGenerator.includes("drupal")) result.cms.push("Drupal")
  else if (xGenerator.includes("joomla")) result.cms.push("Joomla")

  const generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ""
  if (generator) {
    if (generator.toLowerCase().includes("wordpress")) result.cms.push("WordPress")
    else if (generator.toLowerCase().includes("drupal")) result.cms.push("Drupal")
    else if (generator.toLowerCase().includes("joomla")) result.cms.push("Joomla")
    else if (generator.toLowerCase().includes("ghost")) result.cms.push("Ghost")
    else if (generator.toLowerCase().includes("shopify")) result.cms.push("Shopify")
  }
  if (html.includes("Shopify.theme") || h("x-shopid")) {
    if (!result.cms.includes("Shopify")) result.cms.push("Shopify")
  }

  // Analytics
  if (html.includes("google-analytics.com") || html.includes("gtag(") || html.includes("GoogleAnalyticsObject")) result.analytics.push("Google Analytics")
  if (html.includes("plausible.io")) result.analytics.push("Plausible")
  if (html.includes("fathom") && html.includes("cdn.usefathom.com")) result.analytics.push("Fathom")
  if (html.includes("hotjar.com")) result.analytics.push("Hotjar")
  if (html.includes("segment.com/analytics.js")) result.analytics.push("Segment")

  // Deduplicate
  return {
    cdn: [...new Set(result.cdn)],
    framework: [...new Set(result.framework)],
    cms: [...new Set(result.cms)],
    analytics: [...new Set(result.analytics)],
    server: [...new Set(result.server)],
  }
}
