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
        if (isActive) {
          el.dataset.active = 'true';
        } else {
          delete el.dataset.active;
        }
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
      <p className="text-[10px] font-medium text-muted-foreground/55 mb-3 uppercase tracking-[0.12em]">
        On this page
      </p>
      <ul className="space-y-[3px] text-[13px] tracking-[-0.005em] border-l border-border/70">
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
              className="group/toc relative block py-[3px] pl-3 -ml-px transition-colors duration-150 text-muted-foreground/60 hover:text-foreground data-[active=true]:text-foreground data-[active=true]:font-medium"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-px bg-primary scale-y-0 group-data-[active=true]/toc:scale-y-100 transition-transform duration-200 ease-out origin-center"
              />
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
