'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/** Visual treatment. See globals.css `.mdx-quote[data-variant]`. */
export type QuoteVariant = 'editorial' | 'magazine' | 'gutter' | 'watermark' | 'hybrid';

interface QuoteProps {
  children: ReactNode;
  /** Who said it. Rendered after an em-dash. */
  author?: string;
  /** Where it's from (publication, book, talk). Linked when `href` is set. */
  source?: string;
  /** Optional link for the source. */
  href?: string;
  /** Visual treatment. Defaults to `hybrid` (accent gutter mark, borderless). */
  variant?: QuoteVariant;
  /** Attribution alignment. Ignored by `magazine`, which is always centered. */
  align?: 'left' | 'right';
}

export function Quote({ children, author, source, href, variant = 'hybrid', align = 'left' }: QuoteProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  const reduced = useReducedMotion();

  const sourceNode = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {source}
    </a>
  ) : (
    source
  );

  return (
    <motion.figure
      ref={ref}
      className="mdx-quote"
      data-variant={variant}
      data-align={align}
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <blockquote className="mdx-quote__body">{children}</blockquote>
      {(author || source) && (
        <figcaption className="mdx-quote__attribution">
          {author && <span className="mdx-quote__author">{author}</span>}
          {source && <span className="mdx-quote__source">{sourceNode}</span>}
        </figcaption>
      )}
    </motion.figure>
  );
}
