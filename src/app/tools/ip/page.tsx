import { Suspense } from "react"
import IPInfoContent from "./ip-info-content"
import { Loader2 } from "lucide-react"
import { ogUrls, siteConfig } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "IP Information",
  description: "IP address lookup with geolocation data",
  category: "ip",
})

export const metadata = {
  title: "IP Information | Dipak Parmar",
  description: "View your IP address details, lookup any IP, and get geolocation data including ISP, location, and network information.",
  openGraph: {
    title: "IP Information",
    description: "IP address lookup with detailed geolocation, ISP, and network data",
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
    title: "IP Information | Dipak Parmar",
    description: "IP address lookup with detailed geolocation, ISP, and network data",
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
