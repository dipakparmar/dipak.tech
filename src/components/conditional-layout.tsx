'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

export function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLinksPage = pathname === '/links';

  if (isLinksPage) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={0}>
        <div className="font-sans max-w-2xl mx-auto py-12 sm:py-24 px-6">
          {children} <Navbar />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
