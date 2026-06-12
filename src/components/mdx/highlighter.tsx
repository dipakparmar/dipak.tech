'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { annotate } from '@/lib/vendor/rough-notation';
import type { RoughAnnotation } from '@/lib/vendor/rough-notation';

type HighlightIntensity = 'light' | 'medium' | 'strong';

const ITERATIONS: Record<HighlightIntensity, number> = {
  light:  1,
  medium: 2,
  strong: 3,
};

interface HighlighterProps {
  children: ReactNode;
  color?: 'info' | 'tip' | 'warning' | 'danger' | 'purple';
  intensity?: HighlightIntensity;
  /** Padding between the text and the highlight stroke. Defaults to rough-notation's 5px. */
  padding?: number;
  /** Stroke width of the highlight. Defaults to rough-notation's built-in value for highlight type. */
  strokeWidth?: number;
}

export function Highlighter({ children, color, intensity = 'medium', padding, strokeWidth }: HighlighterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fillColor =
      window.getComputedStyle(el).getPropertyValue('--ac-fill').trim() ||
      'oklch(80% 0.12 90 / 0.35)';

    const annotation = annotate(el, {
      type: 'highlight',
      multiline: true,
      color: fillColor,
      iterations: ITERATIONS[intensity],
      animationDuration: reduced ? 0 : 500,
      animate: !reduced,
      ...(padding !== undefined && { padding }),
      ...(strokeWidth !== undefined && { strokeWidth }),
    });
    annotationRef.current = annotation;

    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
  }, [reduced, color, intensity, padding, strokeWidth]);

  useEffect(() => {
    if (!inView) return;
    const annotation = annotationRef.current;
    if (!annotation) return;
    annotation.show();
  }, [inView, reduced]);

  return (
    <span ref={ref} className="mdx-highlighter" data-color={color} data-intensity={intensity}>
      {children}
    </span>
  );
}
