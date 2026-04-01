'use client';

import { useEffect, useRef } from 'react';

import type { TocEntry } from '@/lib/blog';

interface TocProps {
  entries: TocEntry[];
}

export function Toc({ entries }: TocProps) {
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useEffect(() => {
    const map = linkRefs.current;

    function activate(id: string) {
      for (const [entryId, el] of map) {
        const isActive = entryId === id;
        el.style.color = isActive ? 'var(--foreground)' : '';
        el.style.fontWeight = isActive ? '500' : '';
      }
    }

    const observer = new IntersectionObserver(
      (observedEntries) => {
        for (const entry of observedEntries) {
          if (entry.isIntersecting) {
            activate(entry.target.id);
          }
        }
      },
      { rootMargin: '0px 0px -80% 0px' }
    );

    const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
    headings.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav className="hidden xl:block fixed right-[max(2rem,calc(50%-24rem-15rem))] top-24 w-56">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        On this page
      </p>
      <ul className="space-y-1.5 text-sm">
        {entries.map((entry) => (
          <li
            key={entry.id}
            style={{ paddingLeft: `${(entry.level - 2) * 12}px` }}
          >
            <a
              href={`#${entry.id}`}
              ref={(el) => {
                if (el) linkRefs.current.set(entry.id, el);
              }}
              className="block py-0.5 transition-colors text-muted-foreground/70 hover:text-foreground"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
