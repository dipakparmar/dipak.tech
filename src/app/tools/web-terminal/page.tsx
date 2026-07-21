import { Terminal, Usb, Globe, Search } from 'lucide-react';
import { ToolPageHero } from '@/components/tool-page-hero';
import { WebTerminal } from '@/components/web-terminal/web-terminal';
import { ogUrls, siteConfig } from '@/lib/og-config';

const ogImageUrl = ogUrls.tools({
  tool: 'Web Terminal',
  description: 'Browser-based terminal',
  category: 'web-terminal'
});

export const metadata = {
  title: 'Web Terminal | Dipak Parmar',
  description:
    'Browser-based terminal supporting Serial, WebSocket, SSH, and Telnet connections. Connect to Arduino, ESP32, Raspberry Pi and other devices.',
  openGraph: {
    title: 'Web Terminal',
    description:
      'Browser-based terminal for Serial, WebSocket, SSH, and Telnet',
    url: `${siteConfig.tools.baseUrl}/web-terminal`,
    siteName: siteConfig.tools.domain,
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Web Terminal Tool'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Web Terminal | Dipak Parmar',
    description:
      'Browser-based terminal for Serial, WebSocket, SSH, and Telnet',
    images: [ogImageUrl]
  },
  alternates: {
    canonical: `${siteConfig.tools.baseUrl}/web-terminal`
  }
};

export default function WebTerminalPage() {
  return (
    <ToolPageHero
      eyebrow="Web Terminal"
      title="Web Terminal"
      description="Connect via Serial, WebSocket, SSH, or Telnet directly from your browser. Full terminal emulation with ANSI support, search, and session logging."
      accentGlowClassName="bg-violet-500/20"
      accentDotClassName="bg-violet-500"
      bodyClassName="space-y-8"
      pills={[
        { icon: <Usb className="h-4 w-4" />, label: 'Serial Port' },
        { icon: <Globe className="h-4 w-4" />, label: 'WebSocket' },
        { icon: <Terminal className="h-4 w-4" />, label: 'SSH & Telnet' },
        { icon: <Search className="h-4 w-4" />, label: 'Search & Export' }
      ]}
    >
      {/* Terminal */}
      <WebTerminal />
    </ToolPageHero>
  );
}
