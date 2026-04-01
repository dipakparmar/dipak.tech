'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/blog';

interface TocProps {
  entries: TocEntry[];
}

export function Toc({ entries }: TocProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observedEntries) => {
        for (const entry of observedEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '0px 0px -80% 0px' }
    );

    const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
    headings.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  if (entries.length === 0) return null;

  return (
    <nav className="hidden xl:block fixed right-[max(2rem,calc(50%-28rem-12rem))] top-24 w-56">
      <p className="text-[0.65rem] font-medium text-muted-foreground/50 mb-4 uppercase tracking-widest">
        On this page
      </p>
      <ul className="relative space-y-0.5 text-[0.8rem] border-l border-border">
        {entries.map((entry) => {
          const isActive = activeId === entry.id;
          return (
            <li
              key={entry.id}
              className="relative"
            >
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-px bg-foreground -translate-x-px" />
              )}
              <a
                href={`#${entry.id}`}
                className={`block py-1 transition-colors ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
                style={{ paddingLeft: `${8 + (entry.level - 2) * 12}px` }}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
