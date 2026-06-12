'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import {
  annotate,
  type BracketType,
  type RoughAnnotation,
} from '@/lib/vendor/rough-notation';

type MarginNoteColor = 'info' | 'tip' | 'warning' | 'danger' | 'purple';

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
  text?: ReactNode;
  /** Accent colour for the note text and rough-notation bracket. */
  color?: MarginNoteColor;
  /**
   * Which sides of the bracket to draw on desktop. Defaults to `['right']`
   * for standalone and `['left']` for enclosure. Pass `['left', 'right']`
   * for a full enclosing bracket.
   */
  bracketDesktop?: BracketType | BracketType[];
  /**
   * Which sides of the bracket to draw on mobile. Defaults to `['bottom']`.
   * Pass `['top', 'bottom']` for a full enclosing bracket.
   */
  bracketMobile?: BracketType | BracketType[];
}

// rough-notation accepts a total duration and apportions it across paths
// proportionally to their length. For a vertical-`[` bracket on desktop, the
// long vertical stroke dominates, naturally yielding Agentation's pattern of
// (short top ~120ms, long vertical ~550ms, short bottom ~130ms) at 800ms.
const ANNOTATION_DURATION_MS = 800;
const STROKE_WIDTH = 1.2;

function useIsDesktop(query = '(min-width: 1280px)') {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(query);
      const handler = () => onStoreChange();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

interface RoughBracketProps {
  /** Brackets to draw, e.g. ['right'] for desktop `[`, ['bottom'] for `U`. */
  brackets: BracketType[];
  /** Element to wrap the annotation around — the bracket sizes to its bounds. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Optional CSS class for the host span (positioning, sizing). */
  className?: string;
}

/**
 * Mounts a `rough-notation` bracket annotation around the *target* element,
 * driven by the host's visibility via `useInView`. The host span itself stays
 * inline / empty — rough-notation injects its own absolutely-positioned SVG
 * as a sibling of the target.
 */
function RoughBracket({ brackets, targetRef, className }: RoughBracketProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(hostRef, { once: true, margin: '-12% 0px' });
  const reduced = useReducedMotion();
  const annotationRef = useRef<RoughAnnotation | null>(null);

  // Create / refresh annotation when bracket orientation changes.
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const annotation = annotate(target, {
      type: 'bracket',
      brackets,
      strokeWidth: STROKE_WIDTH,
      animationDuration: reduced ? 0 : ANNOTATION_DURATION_MS,
      animate: !reduced,
      // Keep the bracket close to the target — Agentation's brackets sit
      // tight against the text, not floating in a generous padding box.
      padding: 2,
      // Inherit colour from the surrounding handwritten-note styling so
      // theme switches (light/dark) just work without prop drilling.
      color: 'currentColor',
      iterations: 1,
    });
    annotationRef.current = annotation;

    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
  }, [brackets, reduced, targetRef]);

  // Trigger the draw exactly once when the host scrolls into view.
  useEffect(() => {
    if (!inView) return;
    const annotation = annotationRef.current;
    if (!annotation) return;
    // rAF gives the SVG one frame to attach + measure before we start.
    const id = requestAnimationFrame(() => annotation.show());
    return () => cancelAnimationFrame(id);
  }, [inView]);

  return <span ref={hostRef} aria-hidden className={className} />;
}

export function MarginNote({ children, text, color, bracketDesktop, bracketMobile }: MarginNoteProps) {
  const isDesktop = useIsDesktop();

  if (text) {
    return (
      <EnclosureMarginNote
        text={text}
        color={color}
        isDesktop={isDesktop}
        bracketDesktop={bracketDesktop}
        bracketMobile={bracketMobile}
      >
        {children}
      </EnclosureMarginNote>
    );
  }

  return (
    <StandaloneMarginNote
      color={color}
      isDesktop={isDesktop}
      bracketDesktop={bracketDesktop}
      bracketMobile={bracketMobile}
    >
      {children}
    </StandaloneMarginNote>
  );
}

function StandaloneMarginNote({
  children,
  color,
  isDesktop,
  bracketDesktop,
  bracketMobile,
}: {
  children: ReactNode;
  color?: MarginNoteColor;
  isDesktop: boolean;
  bracketDesktop?: BracketType | BracketType[];
  bracketMobile?: BracketType | BracketType[];
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const defaultDesktop: BracketType[] = ['right'];
  const defaultMobile: BracketType[] = ['bottom'];
  const brackets: BracketType[] = isDesktop
    ? (bracketDesktop ? ([] as BracketType[]).concat(bracketDesktop) : defaultDesktop)
    : (bracketMobile  ? ([] as BracketType[]).concat(bracketMobile)  : defaultMobile);

  return (
    <span className="mdx-margin-note" data-color={color} role="note">
      <span ref={textRef} className="mdx-margin-note__text">
        {children}
      </span>
      <RoughBracket
        brackets={brackets}
        targetRef={textRef}
        className="mdx-margin-note__bracket-anchor"
      />
    </span>
  );
}

function EnclosureMarginNote({
  children,
  text,
  color,
  isDesktop,
  bracketDesktop,
  bracketMobile,
}: {
  children: ReactNode;
  text: ReactNode;
  color?: MarginNoteColor;
  isDesktop: boolean;
  bracketDesktop?: BracketType | BracketType[];
  bracketMobile?: BracketType | BracketType[];
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const defaultDesktop: BracketType[] = ['left'];
  const defaultMobile: BracketType[] = ['bottom'];
  const brackets: BracketType[] = isDesktop
    ? (bracketDesktop ? ([] as BracketType[]).concat(bracketDesktop) : defaultDesktop)
    : (bracketMobile  ? ([] as BracketType[]).concat(bracketMobile)  : defaultMobile);

  return (
    <div className="mdx-margin-enclose" data-color={color}>
      <div ref={contentRef} className="mdx-margin-enclose__content">
        {children}
      </div>
      <RoughBracket
        brackets={brackets}
        targetRef={contentRef}
        className="mdx-margin-enclose__bracket-anchor"
      />
      <aside className="mdx-margin-enclose__note">{text}</aside>
    </div>
  );
}
