import { CertificateToolsTabs } from "@/components/cert-tools/certificate-tools-tabs"

export const metadata = {
  title: "Certificate Tools | Dipak Parmar",
  description: "Certificate utilities - CT logs, CSR generator, cert decoder, key generator",
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
