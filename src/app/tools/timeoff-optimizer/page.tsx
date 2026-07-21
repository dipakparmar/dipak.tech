import { CalendarHeart, Globe, Download } from 'lucide-react';
import { Suspense } from 'react';

import { BlurFade } from '@/components/magicui/blur-fade';
import { TimeoffOptimizerTool } from '@/components/timeoff-optimizer/timeoff-optimizer-tool';
import { ToolPageHero } from '@/components/tool-page-hero';
import { detectGeoFromHeaders } from '@/lib/geo';
import { ogUrls } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Time-off Optimizer',
  description:
    'Maximize your PTO by stacking days off around weekends and holidays',
  category: 'timeoff-optimizer'
});

export const metadata = {
  title: 'Time-off Optimizer | Dipak Parmar',
  description:
    'Plan the perfect year of vacations. Stack your PTO days around weekends, public holidays, and company days off to maximize time off.',
  openGraph: {
    title: 'Time-off Optimizer',
    description:
      'Maximize your PTO by stacking days off around weekends, public holidays, and company days.',
    url: 'https://tools.dipak.io/timeoff-optimizer',
    siteName: 'tools.dipak.io',
    type: 'website',
    images: [
      { url: ogImageUrl, width: 1200, height: 630, alt: 'Time-off Optimizer' }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Time-off Optimizer | Dipak Parmar',
    description:
      'Stack your PTO around weekends and holidays for the most time off.',
    images: [ogImageUrl]
  },
  alternates: { canonical: 'https://tools.dipak.io/timeoff-optimizer' }
};

const BLUR_FADE_DELAY = 0.04;

export default async function TimeoffOptimizerPage() {
  const detectedGeo = await detectGeoFromHeaders();
  // Only a boolean — never send the actual secret to the client. Visitors who
  // know the access code enter it themselves in the Subscribe UI.
  const icsSubscribeEnabled = Boolean(process.env.TIMEOFF_OPTIMIZER_ICS_TOKEN);
  return (
    <ToolPageHero
      eyebrow="Time-off Optimizer"
      title="Make every PTO day count"
      description={
        <>
          Plan your year by stacking time off around weekends, public holidays,
          and company days. Pick a strategy and we&rsquo;ll find the dates that
          give you the most rest.
        </>
      }
      containerClassName="relative z-10 pointer-events-auto"
      pills={[
        {
          icon: <CalendarHeart className="h-4 w-4 text-primary" />,
          label: '5 strategies'
        },
        { icon: <Globe className="h-4 w-4" />, label: '200+ countries' },
        { icon: <Download className="h-4 w-4" />, label: 'Export to calendar' }
      ]}
    >
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Suspense
          fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
        >
          <TimeoffOptimizerTool
            detectedGeo={detectedGeo}
            icsSubscribeEnabled={icsSubscribeEnabled}
          />
        </Suspense>
      </BlurFade>

      <p className="text-center text-xs text-muted-foreground/70">
        Everything runs in your browser &mdash; calendar subscriptions are the
        only feature that talks to a server.
      </p>
    </ToolPageHero>
  );
}
