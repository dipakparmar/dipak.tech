'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { annotate, type RoughAnnotation } from '@/lib/vendor/rough-notation';
import {
  ScribbleArrow,
  ScribbleCircle,
  ScribbleHighlight,
} from '@/components/scribble';

type AnnotateType = 'circle' | 'underline' | 'arrow' | 'highlight';

interface AnnotateProps {
  type?: AnnotateType;
  color?: string;
  children: ReactNode;
}

// Match the marker yellow Agentation uses for its scribble underline.
const DEFAULT_UNDERLINE_COLOR = '#FFE066';
const UNDERLINE_DURATION_MS = 800;

function UnderlineAnnotate({
  color,
  children,
}: {
  color?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  const reduced = useReducedMotion();
  const annotationRef = useRef<RoughAnnotation | null>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const annotation = annotate(target, {
      type: 'underline',
      color: color ?? DEFAULT_UNDERLINE_COLOR,
      strokeWidth: 2,
      animationDuration: reduced ? 0 : UNDERLINE_DURATION_MS,
      animate: !reduced,
      iterations: 2,
      // multiline lets the scribble wrap across line breaks correctly.
      multiline: true,
      padding: 1,
    });
    annotationRef.current = annotation;

    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
  }, [color, reduced]);

  useEffect(() => {
    if (!inView) return;
    const annotation = annotationRef.current;
    if (!annotation) return;
    const id = requestAnimationFrame(() => annotation.show());
    return () => cancelAnimationFrame(id);
  }, [inView]);

  return (
    <span ref={ref} className="mdx-annotate-underline">
      {children}
    </span>
  );
}

export function Annotate({
  type = 'underline',
  color,
  children,
}: AnnotateProps) {
  if (type === 'circle') {
    return (
      <span className="relative inline-flex items-center justify-center px-[6px] mx-[1px] leading-none align-baseline">
        <span className="relative z-10">{children}</span>
        <ScribbleCircle
          color={color}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-[170%] pointer-events-none overflow-visible"
        />
      </span>
    );
  }

  if (type === 'highlight') {
    return (
      <span className="relative inline-block px-[3px] mx-[1px]">
        <ScribbleHighlight
          color={color}
          className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-visible"
        />
        <span className="relative z-10">{children}</span>
      </span>
    );
  }

  if (type === 'arrow') {
    return (
      <span className="inline-flex items-baseline gap-[2px] align-baseline">
        <span>{children}</span>
        <span
          aria-hidden
          className="inline-block w-[28px] h-[14px] translate-y-[1px]"
        >
          <ScribbleArrow color={color} className="w-full h-full overflow-visible" />
        </span>
      </span>
    );
  }

  return <UnderlineAnnotate color={color}>{children}</UnderlineAnnotate>;
}
