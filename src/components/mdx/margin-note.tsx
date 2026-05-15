'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

interface MarginNoteProps {
  children: ReactNode;
  /**
   * When provided, switches the component to *enclosure* mode: `children`
   * becomes the wrapped content and `text` is rendered as the handwritten
   * note. The bracket then explicitly scopes the content (vertical `[` on
   * desktop, horizontal `U` below content on mobile).
   *
   * Omit `text` and the component renders in *standalone* mode: `children`
   * is the handwritten note, anchored to the previous paragraph.
   */
  text?: string;
}

const DRAW_EASE = [0.45, 0.05, 0.55, 0.95] as const;
const DRAW_DURATION = 1.15;

function useIsDesktop(query = '(min-width: 1280px)') {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return isDesktop;
}

function RevealBracket({ className }: { className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  const isDesktop = useIsDesktop();
  const reduced = useReducedMotion();

  // Directional reveal: desktop `[` draws top→bottom; mobile `U` draws left→right.
  const collapsed = isDesktop ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)';
  const expanded = 'inset(0%)';

  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={className}
      initial={reduced ? false : { clipPath: collapsed }}
      animate={{ clipPath: inView || reduced ? expanded : collapsed }}
      transition={{ duration: reduced ? 0 : DRAW_DURATION, ease: DRAW_EASE }}
    />
  );
}

export function MarginNote({ children, text }: MarginNoteProps) {
  if (text) {
    return (
      <div className="mdx-margin-enclose">
        <div className="mdx-margin-enclose__content">{children}</div>
        <RevealBracket className="mdx-margin-enclose__bracket" />
        <aside className="mdx-margin-enclose__note">{text}</aside>
      </div>
    );
  }

  return (
    <aside className="mdx-margin-note">
      <RevealBracket className="mdx-margin-note__bracket" />
      <span className="mdx-margin-note__text">{children}</span>
    </aside>
  );
}
