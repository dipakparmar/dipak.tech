import { ArrowLeft, Headphones, Lock, Waves } from 'lucide-react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { EightDAudioConverter } from '@/components/eight-d-audio/eight-d-audio-converter';
import Link from 'next/link';
import { buildHref } from '@/lib/host-routing';
import { headers } from 'next/headers';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: '8D Audio Converter',
  description: 'Turn any track into immersive 8D audio, right in your browser',
  category: '8d-audio'
});

export const metadata = {
  title: '8D Audio Converter | Dipak Parmar',
  description:
    'Convert any song into immersive 8D audio with a live visualizer. Adjust rotation, reverb, and bass, then export to WAV. Everything runs client-side in your browser.',
  openGraph: {
    title: '8D Audio Converter',
    description:
      'Turn any track into immersive 8D audio with a live visualizer, right in your browser',
    url: 'https://tools.dipak.io/music/8d-audio',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      { url: ogImageUrl, width: 1200, height: 630, alt: '8D Audio Converter' }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '8D Audio Converter | Dipak Parmar',
    description:
      'Turn any track into immersive 8D audio with a live visualizer, right in your browser',
    images: [ogImageUrl]
  },
  alternates: { canonical: 'https://tools.dipak.io/music/8d-audio' }
};

const BLUR_FADE_DELAY = 0.04;

export default async function EightDAudioPage() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const musicHref = buildHref('tools', 'music', host);
  return (
    <main className="min-h-screen overflow-x-clip bg-background">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-sky-500/20 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10 sm:py-16 md:py-24 pointer-events-auto">
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-14">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-2">
              <Link
                href={musicHref}
                aria-label="Back to Music Tools"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                </span>
                <span className="text-sm font-medium">8D Audio Converter</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                8D Audio Converter
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Turn any song into immersive 8D audio that spins around your
                head. Tweak the rotation, reverb, and bass live, watch it in the
                visualizer, then export a WAV. Everything runs client-side, your
                audio never leaves your browser.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Client-Side Only</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Headphones className="h-4 w-4" />
                  <span>Best with Headphones</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Waves className="h-4 w-4" />
                  <span>Live Visualizer</span>
                </div>
              </div>
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <EightDAudioConverter />
          </BlurFade>
        </div>
      </div>
    </main>
  );
}
