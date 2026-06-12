'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Info, Lightbulb, TriangleAlert, CircleAlert, Sparkles } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { annotate } from '@/lib/vendor/rough-notation';
import type { RoughAnnotation } from '@/lib/vendor/rough-notation';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const config: Record<CalloutType, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  note:      { label: 'Note',      Icon: Info },
  tip:       { label: 'Tip',       Icon: Lightbulb },
  important: { label: 'Important', Icon: Sparkles },
  warning:   { label: 'Warning',   Icon: TriangleAlert },
  caution:   { label: 'Caution',   Icon: CircleAlert },
};

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const { label, Icon } = config[type];
  const ref = useRef<HTMLDivElement>(null);
  const roughRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = roughRef.current;
    if (!el) return;
    const annotation = annotate(el, {
      type: 'box',
      strokeWidth: 1.5,
      color: 'currentColor',
      animationDuration: reduced ? 0 : 500,
      animate: !reduced,
      padding: 0,
      iterations: 1,
    });
    annotationRef.current = annotation;
    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (!inView) return;
    const annotation = annotationRef.current;
    if (!annotation) return;
    const id = setTimeout(() => annotation.show(), reduced ? 0 : 380);
    return () => clearTimeout(id);
  }, [inView, reduced]);

  return (
    <motion.div
      ref={ref}
      className="mdx-callout"
      data-type={type}
      role="note"
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <span ref={roughRef} className="mdx-callout__rough-anchor" aria-hidden />
      <div className="mdx-callout__header">
        <motion.span
          aria-hidden
          initial={{ scale: reduced ? 1 : 0.5, opacity: reduced ? 1 : 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : undefined}
          transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.12 }}
        >
          <Icon size={15} />
        </motion.span>
        <span>{title ?? label}</span>
      </div>
      <div className="mdx-callout__body">{children}</div>
    </motion.div>
  );
}
