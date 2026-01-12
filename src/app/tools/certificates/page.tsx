import { CertificateToolsTabs } from "@/components/cert-tools/certificate-tools-tabs"
import { ogUrls } from "@/lib/og-config"

const ogImageUrl = ogUrls.tools({
  tool: "Certificate Tools",
  description: "Search CT logs, decode certificates, generate CSRs and key pairs",
  category: "certificates",
})

export const metadata = {
  title: "Certificate Tools | Dipak Parmar",
  description: "Certificate utilities - CT logs, CSR generator, cert decoder, key generator",
  openGraph: {
    title: "Certificate Tools",
    description: "Search CT logs, decode certificates, generate CSRs and key pairs",
    url: "https://tools.dipak.io/certificates",
    siteName: "tools.dipak.io",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Certificate Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Certificate Tools | Dipak Parmar",
    description: "Search CT logs, decode certificates, generate CSRs and key pairs",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tools.dipak.io/certificates",
  },
}

export default function CertificateToolsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <CertificateToolsTabs />
      </div>
    </main>
  )
}
