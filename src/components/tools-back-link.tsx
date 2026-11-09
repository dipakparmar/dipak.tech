'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { canonicalBaseUrls, detectHost } from '@/lib/host-routing';

/** Tool routes that render their own back control; one per page is enough. */
const HAS_OWN_BACK = /^\/(certificates\/view\/|music(\/|$)|studio(\/|$))/;

/**
 * "All tools" link shown on every tool page, hidden on the tools index.
 * The index lives at `/` on the tools host, at `/tools` on the main site and
 * locally, and on another tool's own host (e.g. whois) only by absolute URL.
 * Resolved after mount from the real host, so pages stay statically rendered.
 */
export function ToolsBackLink() {
  const pathname = usePathname();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const host = detectHost(window.location.host);
    const onIndex =
      pathname === '/tools' || (host === 'tools' && pathname === '/');
    setHref(
      onIndex
        ? null
        : host === 'tools'
          ? '/'
          : host === null || host === 'portfolio'
            ? '/tools'
            : canonicalBaseUrls.tools
    );
  }, [pathname]);

  // Path relative to the tools root, the same on the tools host and under /tools.
  const toolPath = pathname.replace(/^\/tools(?=\/|$)/, '') || '/';
  if (pathname === '/tools' || HAS_OWN_BACK.test(toolPath)) return null;

  // The row is always rendered so the page does not shift when the link
  // appears after mount; it lines up with the fixed theme toggle.
  return (
    <nav aria-label="Tools" className="h-12 px-4 pt-4">
      {href && (
        <a
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </a>
      )}
    </nav>
  );
}
