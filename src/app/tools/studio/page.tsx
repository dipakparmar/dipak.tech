import { StudioTool } from "@/components/studio/studio-tool"
import { buildHref } from "@/lib/host-routing"
import { headers } from "next/headers"
import { ogUrls } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "Design Studio",
  description: "Design social posts, stories, carousels and covers with templates and hand-drawn touches",
  category: "default",
})

export const metadata = {
  title: "Design Studio | Dipak Parmar",
  description:
    "Free browser-based design studio for social media posts, stories, carousels, covers, and wallpapers. Multi-page projects, handwritten text and hand-drawn shapes over your photos, glossy overlays, reusable templates, and hi-res PNG/JPEG export. Everything runs client-side.",
  openGraph: {
    title: "Design Studio",
    description:
      "Design social posts, stories, carousels and covers with templates, handwriting fonts, and hand-drawn shapes - right in your browser",
    url: "https://tools.dipak.io/studio",
    siteName: "tools.dipak.io",
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Design Studio" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Design Studio | Dipak Parmar",
    description:
      "Design social posts, stories, carousels and covers with templates, handwriting fonts, and hand-drawn shapes - right in your browser",
    images: [ogImageUrl],
  },
  alternates: { canonical: "https://tools.dipak.io/studio" },
}

export default async function StudioPage() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const toolsHref = buildHref("tools", "", host)
  return (
    <main className="h-dvh overflow-hidden bg-background">
      <StudioTool backHref={toolsHref} />
    </main>
  )
}
