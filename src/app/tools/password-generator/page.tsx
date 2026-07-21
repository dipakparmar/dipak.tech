import { Lock, ShieldCheck, Share2 } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { Suspense } from 'react';
import { PasswordGenerator } from '@/components/password-generator/password-generator';
import { ToolPageHero } from '@/components/tool-page-hero';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Password Generator',
  description:
    'Generate secure passwords, passphrases, PINs, salts, and API keys',
  category: 'password-generator'
});

export const metadata = {
  title: 'Password Generator | Dipak Parmar',
  description:
    'Generate cryptographically secure passwords, passphrases, PINs, salts, API keys, and UUIDs. All generation happens client-side.',
  openGraph: {
    title: 'Password Generator',
    description:
      'Generate secure passwords, passphrases, PINs, salts, and API keys',
    url: 'https://tools.dipak.io/password-generator',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      { url: ogImageUrl, width: 1200, height: 630, alt: 'Password Generator' }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Password Generator | Dipak Parmar',
    description:
      'Generate secure passwords, passphrases, PINs, salts, and API keys',
    images: [ogImageUrl]
  },
  alternates: { canonical: 'https://tools.dipak.io/password-generator' }
};

const BLUR_FADE_DELAY = 0.04;

export default function PasswordGeneratorPage() {
  return (
    <ToolPageHero
      eyebrow="Password Generator"
      title="Secure Password Generator"
      description="Generate cryptographically secure passwords, passphrases, PINs, salts, API keys, and UUIDs. Everything runs client-side in your browser."
      accentGlowClassName="bg-indigo-500/20"
      accentDotClassName="bg-indigo-500"
      containerClassName="relative z-10 pointer-events-auto"
      pills={[
        { icon: <Lock className="h-4 w-4" />, label: 'Client-Side Only' },
        {
          icon: <ShieldCheck className="h-4 w-4" />,
          label: 'Cryptographically Secure'
        },
        { icon: <Share2 className="h-4 w-4" />, label: 'Shareable Config' }
      ]}
    >
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
        >
          <PasswordGenerator />
        </Suspense>
      </BlurFade>
    </ToolPageHero>
  );
}
