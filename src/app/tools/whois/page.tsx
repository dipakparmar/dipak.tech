import { Globe, Hash, Network } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { ToolPageHero } from '@/components/tool-page-hero';
import { WhoisTool } from '@/components/whois-tool';
import { ogUrls, siteConfig } from '@/lib/og-config';

const ogImageUrl = ogUrls.whois({
  tool: 'WHOIS Lookup',
  description: 'Domain, IP, and ASN registration lookup via RDAP',
  category: 'whois'
});

export const metadata = {
  title: 'WHOIS Lookup | Dipak Parmar',
  description:
    'Look up domain registration, IP network, and ASN information using RDAP protocol',
  openGraph: {
    title: 'WHOIS Lookup',
    description: 'Domain, IP, and ASN registration lookup via RDAP protocol',
    url: siteConfig.whois.baseUrl,
    siteName: siteConfig.whois.domain,
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'WHOIS Lookup'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WHOIS Lookup | Dipak Parmar',
    description: 'Domain, IP, and ASN registration lookup via RDAP protocol',
    images: [ogImageUrl]
  },
  alternates: {
    canonical: siteConfig.whois.baseUrl
  }
};

const BLUR_FADE_DELAY = 0.04;

export default function Page() {
  return (
    <ToolPageHero
      eyebrow="WHOIS Lookup"
      title="Domain & IP Registration"
      description="Look up registration details for domains, IP addresses, and autonomous systems using the RDAP protocol."
      accentGlowClassName="bg-amber-500/20"
      accentDotClassName="bg-amber-500"
      pills={[
        { icon: <Globe className="h-4 w-4" />, label: 'Domain WHOIS' },
        { icon: <Network className="h-4 w-4" />, label: 'IP Networks' },
        { icon: <Hash className="h-4 w-4" />, label: 'ASN Lookup' }
      ]}
    >
      {/* Search Component */}
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}
        >
          <WhoisTool />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
