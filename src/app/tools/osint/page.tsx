import { Globe, Hash, Network } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { ToolPageHero } from '@/components/tool-page-hero';
import { WhoisLookup } from '@/components/whois-lookup';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'OSINT Scanner',
  description: 'Domain & IP intelligence with WHOIS, DNS, and geolocation',
  category: 'osint'
});

export const metadata = {
  title: 'OSINT Scanner | Dipak Parmar',
  description:
    'Domain & IP intelligence - WHOIS lookup, DNS records, IP geolocation, and domain analysis',
  openGraph: {
    title: 'OSINT Scanner',
    description:
      'Domain & IP intelligence - WHOIS, DNS, and IP geolocation tools',
    url: 'https://tools.dipak.io/osint',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'OSINT Scanner'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OSINT Scanner | Dipak Parmar',
    description:
      'Domain & IP intelligence - WHOIS, DNS, and IP geolocation tools',
    images: [ogImageUrl]
  },
  alternates: {
    canonical: 'https://tools.dipak.io/osint'
  }
};

const BLUR_FADE_DELAY = 0.04;

export default function Page() {
  return (
    <ToolPageHero
      eyebrow="OSINT Command Center"
      title="Domain & IP Intelligence"
      description="Investigate domains, IPs, and autonomous systems with live DNS, HTTP, TLS, and geo intelligence. Powered by RDAP and OSINT APIs."
      accentGlowClassName="bg-emerald-500/20"
      accentDotClassName="bg-emerald-500"
      pills={[
        { icon: <Globe className="h-4 w-4" />, label: 'Domains & RDAP' },
        { icon: <Network className="h-4 w-4" />, label: 'DNS & IP Intel' },
        { icon: <Hash className="h-4 w-4" />, label: 'ASN & TLS Signals' }
      ]}
    >
      {/* Search Component */}
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}
        >
          <WhoisLookup />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
