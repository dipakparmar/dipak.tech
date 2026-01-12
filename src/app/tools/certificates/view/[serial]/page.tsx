import { Metadata } from "next"
import { ogUrls, siteConfig } from "@/lib/og-config"
import { CertificateViewContent } from "./CertificateViewContent"

interface CertificateViewPageProps {
  params: Promise<{ serial: string }>
}

export async function generateMetadata({
  params,
}: CertificateViewPageProps): Promise<Metadata> {
  const { serial } = await params

  // Fetch certificate data for metadata
  let commonName = "Certificate"
  try {
    const response = await fetch(
      `https://ct.certkit.io/certificate/serial/${serial}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    )
    if (response.ok) {
      const data = await response.json()
      commonName = data.certificate?.commonName || "Certificate"
    }
  } catch {
    // Use default if fetch fails
  }

  const description = `View SSL certificate details for ${commonName}`

  const ogImageUrl = ogUrls.tools({
    tool: commonName,
    description: "SSL Certificate Details",
    category: "certificates",
  })

  return {
    title: `${commonName} - Certificate Details`,
    description,
    openGraph: {
      title: `${commonName} - Certificate Details`,
      description,
      url: `${siteConfig.tools.baseUrl}/certificates/view/${serial}`,
      siteName: siteConfig.tools.domain,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Certificate details for ${commonName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${commonName} - Certificate Details`,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function CertificateViewPage({
  params,
}: CertificateViewPageProps) {
  const { serial } = await params
  return <CertificateViewContent serial={serial} />
}
