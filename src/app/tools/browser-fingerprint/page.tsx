import { Radar, Fingerprint, ShieldOff } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { BrowserFingerprint } from '@/components/browser-fingerprint';
import { ToolPageHero } from '@/components/tool-page-hero';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'The Machine You Look Like',
  description:
    'Put your browser on the bench and watch it get probed, one component at a time',
  category: 'browser-fingerprint'
});

export const metadata = {
  title: 'The Machine You Look Like | Browser Fingerprint',
  description:
    'Put your browser on the diagnostic bench and watch it get probed live: location, GPU, fonts, battery, time zone, and more, read with standard browser APIs. Everything runs on your device and is sent to no one.',
  openGraph: {
    title: 'The Machine You Look Like',
    description:
      'Put your browser on the bench and watch it get probed, one component at a time. Nothing leaves your device.',
    url: 'https://tools.dipak.io/browser-fingerprint',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'The Machine You Look Like'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'The Machine You Look Like | Browser Fingerprint',
    description:
      'Put your browser on the bench and watch it get probed, one component at a time.',
    images: [ogImageUrl]
  },
  alternates: { canonical: 'https://tools.dipak.io/browser-fingerprint' }
};

const BLUR_FADE_DELAY = 0.04;

export default function BrowserFingerprintPage() {
  return (
    <ToolPageHero
      eyebrow="Diagnostic Bench"
      title="The Machine You Look Like"
      description={
        <>
          Your browser just climbed onto the bench. Watch it get probed one
          component at a time: the city its address leaks, the chip that draws
          its pixels, the fonts it happens to carry. Each reading is soldered
          into a single fingerprint, and none of it leaves this device.
        </>
      }
      accentGlowClassName="bg-violet-500/20"
      accentDotClassName="bg-violet-500"
      pills={[
        {
          icon: <Fingerprint className="h-4 w-4" />,
          label: 'Standard browser APIs'
        },
        { icon: <Radar className="h-4 w-4" />, label: 'Live probe' },
        { icon: <ShieldOff className="h-4 w-4" />, label: 'Sent to no one' }
      ]}
    >
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
        >
          <BrowserFingerprint />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
