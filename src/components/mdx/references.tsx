'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface ReferenceItem {
  href: string;
  label: ReactNode;
}

interface ReferencesProps {
  items: ReferenceItem[];
}

export function References({ items }: ReferencesProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-10% 0px' });
  const reduced = useReducedMotion();

  return (
    <section ref={sectionRef} className="mdx-references-section" data-footnotes>
      <h2 id="footnote-label" className="mdx-references-label">
        References
      </h2>
      <ol className="mdx-references">
        {items.map((item, index) => {
          const n = index + 1;
          return (
            <motion.li
              key={`${n}-${item.href}`}
              id={`ref-${n}`}
              initial={{ opacity: 0, x: reduced ? 0 : -10 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{
                duration: 0.3,
                delay: reduced ? 0 : index * 0.055,
                ease: 'easeOut',
              }}
            >
              <a
                className="mdx-references-link"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
              <a
                className="mdx-references-backref"
                href={`#cite-${n}`}
                aria-label={`Back to reference ${n} in text`}
                title="Back to text"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path className="mdx-references-backref-hook" d="M11 20H14.5A5.5 5.5 0 0 0 14.5 9H4" pathLength="1" />
                  <path className="mdx-references-backref-head" d="M9 14 4 9l5-5" pathLength="1" />
                </svg>
              </a>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
