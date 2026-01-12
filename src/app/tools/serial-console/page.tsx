import { Terminal, Usb, Globe, Network, Search } from 'lucide-react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { SerialConsole } from '@/components/serial-console/serial-console';
import { ogUrls, siteConfig } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Serial Console',
  description: 'Web-based serial terminal',
  category: 'serial-console',
});

export const metadata = {
  title: 'Serial Console | Dipak Parmar',
  description:
    'Browser-based serial terminal for Arduino, ESP32, Raspberry Pi and other serial devices. Supports Serial, WebSocket, SSH, and Telnet connections.',
  openGraph: {
    title: 'Serial Console',
    description: 'Web-based serial terminal for Arduino, ESP32, and more',
    url: `${siteConfig.tools.baseUrl}/serial-console`,
    siteName: siteConfig.tools.domain,
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Serial Console Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Serial Console | Dipak Parmar',
    description: 'Web-based serial terminal for Arduino, ESP32, and more',
    images: [ogImageUrl],
  },
  alternates: {
    canonical: `${siteConfig.tools.baseUrl}/serial-console`,
  },
};

const BLUR_FADE_DELAY = 0.04;

export default function SerialConsolePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Gradient background effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-violet-500/20 opacity-20 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Hero Section */}
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                </span>
                <span className="text-sm font-medium">Serial Console</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Web Serial Terminal
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Connect to Arduino, ESP32, Raspberry Pi, and other devices directly from your browser.
                Full terminal emulation with ANSI support, search, and session logging.
              </p>
              {/* Feature pills */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Usb className="h-4 w-4" />
                  <span>Serial Port</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>WebSocket</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Terminal className="h-4 w-4" />
                  <span>SSH & Telnet</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span>Search & Export</span>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Terminal */}
          <SerialConsole />
        </div>
      </div>
    </main>
  );
}
