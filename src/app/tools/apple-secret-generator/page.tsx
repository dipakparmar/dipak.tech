import { Lock, Shield, Clock } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { AppleSecretGenerator } from '@/components/apple-secret-generator';
import { ToolPageHero } from '@/components/tool-page-hero';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Apple Client Secret Generator',
  description: 'Generate signed JWTs for Sign in with Apple',
  category: 'apple-secret-generator'
});

export const metadata = {
  title: 'Apple Client Secret Generator | Dipak Parmar',
  description:
    'Generate ES256-signed JWTs for use as client_secret with Sign in with Apple. All signing happens client-side in your browser.',
  openGraph: {
    title: 'Apple Client Secret Generator',
    description: 'Generate signed JWTs for Sign in with Apple',
    url: 'https://tools.dipak.io/apple-secret-generator',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Apple Client Secret Generator'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Apple Client Secret Generator | Dipak Parmar',
    description: 'Generate signed JWTs for Sign in with Apple',
    images: [ogImageUrl]
  },
  alternates: { canonical: 'https://tools.dipak.io/apple-secret-generator' }
};

const BLUR_FADE_DELAY = 0.04;

export default function AppleSecretGeneratorPage() {
  return (
    <ToolPageHero
      eyebrow="Apple Client Secret"
      title="Apple Client Secret Generator"
      description={
        <>
          Generate ES256-signed JWTs for use as{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            client_secret
          </code>{' '}
          with Sign in with Apple. Everything runs client-side in your
          browser.
        </>
      }
      accentGlowClassName="bg-rose-500/20"
      accentDotClassName="bg-rose-500"
      containerClassName="relative z-10 pointer-events-auto"
      pills={[
        { icon: <Lock className="h-4 w-4" />, label: 'Client-Side Only' },
        { icon: <Shield className="h-4 w-4" />, label: 'ES256 Signing' },
        { icon: <Clock className="h-4 w-4" />, label: 'Configurable Lifetime' }
      ]}
    >
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
        >
          <AppleSecretGenerator />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
