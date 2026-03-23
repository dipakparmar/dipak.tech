import { Suspense } from "react"
import IPInfoContent from "./ip-info-content"
import { Loader2 } from "lucide-react"
import { ogUrls, siteConfig } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "IP & Network Intelligence",
  description: "IP, ASN, BGP prefix lookup with network intelligence",
  category: "ip",
})

export const metadata = {
  title: "IP & Network Intelligence | Dipak Parmar",
  description: "Look up IP addresses, ASNs, BGP prefixes, and network block details with geolocation, routing, and peer data.",
  openGraph: {
    title: "IP & Network Intelligence",
    description: "IP, ASN, and BGP prefix lookup with network intelligence, geolocation, and routing data",
    url: siteConfig.ip.baseUrl,
    siteName: siteConfig.ip.domain,
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "IP Information Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IP & Network Intelligence | Dipak Parmar",
    description: "IP, ASN, and BGP prefix lookup with network intelligence, geolocation, and routing data",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: siteConfig.ip.baseUrl,
  },
}

export default function IPInfoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-100 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <IPInfoContent />
    </Suspense>
  )
}
