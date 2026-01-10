import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/mode-toggle';

export default function ContainerRegistryLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={0}>
        <div className="font-sans max-w-2xl mx-auto py-12 sm:py-24 px-6 overflow-x-hidden">
          <div className="fixed top-4 right-4 z-50">
            <ModeToggle />
          </div>
          {children}
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
