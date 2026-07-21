import { BlurFade } from '@/components/magicui/blur-fade';
import type { ReactNode } from 'react';

export interface ToolPageHeroProps {
  /** Small pill above the title, e.g. "OSINT Command Center". */
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /**
   * Tailwind background class for the glow and the pinging status dot,
   * e.g. 'bg-violet-500'. Defaults to the brand accent.
   */
  accentClassName?: string;
  /** Optional feature pills rendered under the description. */
  pills?: { icon: ReactNode; label: string }[];
  blurFadeDelay?: number;
  children: ReactNode;
  /** Vertical rhythm of the page body. Defaults to the majority `space-y-14`. */
  bodyClassName?: string;
}

export function ToolPageHero({
  eyebrow,
  title,
  description,
  accentClassName = 'bg-primary',
  pills,
  blurFadeDelay = 0.04,
  children,
  bodyClassName = 'space-y-14'
}: ToolPageHeroProps) {
  return (
    <main className="min-h-screen bg-background">
      {/* Gradient background effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]">
        <div
          className={`absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full opacity-20 blur-[100px] ${accentClassName}/20`}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className={`mx-auto max-w-6xl ${bodyClassName}`}>
          {/* Hero Section */}
          <BlurFade delay={blurFadeDelay}>
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${accentClassName}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${accentClassName}`}
                  />
                </span>
                <span className="text-sm font-medium">{eyebrow}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                {description}
              </p>
              {pills && pills.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {pills.map((pill) => (
                    <div
                      key={pill.label}
                      className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      {pill.icon}
                      <span>{pill.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BlurFade>
          {children}
        </div>
      </div>
    </main>
  );
}
