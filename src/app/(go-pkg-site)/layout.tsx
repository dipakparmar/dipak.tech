import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function GoPackageLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={0}>
        <div className="font-sans max-w-2xl mx-auto py-12 sm:py-24 px-6">
          {children}
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
