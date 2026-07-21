import { Route, ShieldCheck, Clock } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { HeaderAnalyzer } from '@/components/message-header-analyzer/header-analyzer';
import { ToolPageHero } from '@/components/tool-page-hero';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Message Header Analyzer',
  description:
    'Parse email headers, trace routing hops, and verify authentication',
  category: 'message-header-analyzer'
});

export const metadata = {
  title: 'Message Header Analyzer | Dipak Parmar',
  description:
    'Parse and analyze email headers to trace routing hops, measure delays, and verify SPF/DKIM/DMARC authentication results',
  openGraph: {
    title: 'Message Header Analyzer',
    description:
      'Parse email headers, trace routing hops, and verify authentication',
    url: 'https://tools.dipak.io/message-header-analyzer',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Message Header Analyzer'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Message Header Analyzer | Dipak Parmar',
    description:
      'Parse email headers, trace routing hops, and verify authentication',
    images: [ogImageUrl]
  },
  alternates: {
    canonical: 'https://tools.dipak.io/message-header-analyzer'
  }
};

const BLUR_FADE_DELAY = 0.04;

export default function Page() {
  return (
    <ToolPageHero
      eyebrow="Message Header Analyzer"
      title="Message Header Analyzer"
      description="Parse and analyze email headers to trace routing hops, measure delays, and verify authentication results."
      accentGlowClassName="bg-orange-500/20"
      accentDotClassName="bg-orange-500"
      pills={[
        { icon: <Route className="h-4 w-4" />, label: 'Routing Timeline' },
        { icon: <ShieldCheck className="h-4 w-4" />, label: 'SPF/DKIM/DMARC' },
        { icon: <Clock className="h-4 w-4" />, label: 'Hop Delays' }
      ]}
    >
      {/* Analyzer Component */}
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-14 animate-pulse rounded-xl bg-muted" />}
        >
          <HeaderAnalyzer />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
