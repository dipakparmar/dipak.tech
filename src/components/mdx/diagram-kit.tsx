'use client';

import { useInView, useReducedMotion } from 'motion/react';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { richHtml, richInline } from './rich-text';

// Shared plumbing for the SVG diagram components. Colors are resolved by CSS
// in globals.css (`.flow-diagram [data-color="..."]` sets --mn-color/--ac-fill)
// rather than Tailwind classes, because content/blog/*.mdx isn't in the
// Tailwind content globs — a class only ever written in an .mdx file gets
// tree-shaken. Every diagram root keeps the `flow-diagram` class for that
// reason, whatever shape it draws.
export type FlowColor =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'info'
  | 'tip'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'neutral';

export const DEFAULT_CYCLE: FlowColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5'
];

const PALETTE = new Set<string>([
  ...DEFAULT_CYCLE,
  'info',
  'tip',
  'warning',
  'danger',
  'purple',
  'neutral'
]);

/**
 * A palette key, or any CSS color value for something off-palette —
 * `"#e76f51"`, `"oklch(60% 0.2 20)"`, `"var(--brand)"`.
 *
 * Palette keys are the default and the recommendation: they resolve through
 * CSS variables, so they already have a light and a dark value. A raw value
 * is used as given in both themes, so pick one that reads on either, or hand
 * in a `var(--your-token)` you define per-theme yourself.
 *
 * The `string & {}` keeps editor autocomplete for the keys while still
 * accepting an arbitrary value.
 */
export type DiagramColor = FlowColor | (string & {});

/** True for the built-in keys, which CSS resolves via `[data-color]`. */
export function isPaletteColor(color: DiagramColor): color is FlowColor {
  return PALETTE.has(color);
}

/** Pinned color if given, otherwise the next entry in the default cycle. */
export function cycleColor(i: number, override?: DiagramColor): DiagramColor {
  return override ?? DEFAULT_CYCLE[i % DEFAULT_CYCLE.length];
}

/**
 * Props that put `color` on an element: a `data-color` attribute for palette
 * keys (styled by `.flow-diagram [data-color=...]` in globals.css), or the
 * same two custom properties set inline for a raw CSS color.
 *
 * Everything downstream just reads `var(--mn-color)` / `var(--ac-fill)` and
 * doesn't care which route the value took.
 */
export function colorProps(
  color: DiagramColor | undefined,
  style?: CSSProperties
): { 'data-color'?: string; style?: CSSProperties } {
  if (!color) return style ? { style } : {};
  if (isPaletteColor(color))
    return { 'data-color': color, ...(style && { style }) };
  return {
    style: {
      ...style,
      '--mn-color': color,
      '--ac-fill': `color-mix(in oklab, ${color} 18%, transparent)`
    } as CSSProperties
  };
}

/**
 * How a diagram sits in the article column.
 * - `center` (default) — natural width, centered.
 * - `left` / `right` — natural width, flush to that side.
 * - `full` — stretched to the full column width, however wide that is.
 *
 * Every diagram has a natural width in SVG units and never renders wider
 * than the column, so `full` only ever scales a narrow diagram up.
 */
export type DiagramAlign = 'left' | 'center' | 'right' | 'full';

/** className + style for a diagram's root <svg>, honoring `align`. */
export function svgLayout(
  align: DiagramAlign = 'center',
  naturalWidth: number,
  className?: string
): { className: string; style: CSSProperties } {
  const alignClass =
    align === 'left'
      ? 'mr-auto'
      : align === 'right'
        ? 'ml-auto'
        : align === 'full'
          ? ''
          : 'mx-auto';
  return {
    className:
      `flow-diagram w-full my-6 ${alignClass} ${className ?? ''}`.trim(),
    style: { maxWidth: align === 'full' ? '100%' : naturalWidth }
  };
}

export interface DiagramMotionOptions {
  /** `false` renders the finished diagram with no entrance at all. */
  enabled?: boolean;
  /** Multiplier: 2 runs twice as fast, 0.5 half speed. Default 1. */
  speed?: number;
  /** Seconds between consecutive elements. Overrides the diagram's default. */
  stagger?: number;
  /** Replay the entrance every time it scrolls back into view. Default true
   *  (play once). */
  once?: boolean;
}

/** `animate={false}` switches the entrance off; an object tunes it. */
export type DiagramMotion = boolean | DiagramMotionOptions;

function motionOptions(animate: DiagramMotion = true): DiagramMotionOptions {
  return typeof animate === 'object' ? animate : { enabled: animate };
}

interface RevealSpec {
  /** Starting state, e.g. `{ opacity: 0, y: 4 }`. */
  from: Record<string, number>;
  duration: number;
  delay?: number;
  /** Breathe on a loop once revealed, to mark the one element worth looking at. */
  pulse?: boolean;
}

const PULSE_DURATION = 1.8;

/**
 * Play the entrance once the diagram scrolls into view, and hand back the
 * helpers a diagram needs to honor the caller's `animate` prop.
 *
 * The entrance is skipped entirely — everything renders in its final state —
 * when the reader prefers reduced motion or `animate` is `false`.
 */
export function useReveal<T extends Element>(
  amount = 0.25,
  animate: DiagramMotion = true
) {
  const opts = motionOptions(animate);
  const speed = opts.speed && opts.speed > 0 ? opts.speed : 1;
  const enabled = opts.enabled !== false;
  const ref = useRef<T>(null);
  const isInView = useInView(ref, { once: opts.once !== false, amount });
  const reduceMotion = Boolean(useReducedMotion()) || !enabled;
  const played = reduceMotion || isInView;

  /** A transition with the caller's speed applied. */
  const t = (duration: number, delay = 0) => ({
    duration: duration / speed,
    delay: delay / speed,
    ease: 'easeOut' as const
  });

  /** The diagram's own per-element stagger, unless the caller set one. */
  const staggerOr = (fallback: number) => opts.stagger ?? fallback;

  /** initial/animate/transition for one element's entrance. */
  const reveal = ({ from, duration, delay = 0, pulse = false }: RevealSpec) => {
    const to: Record<string, number> = {};
    for (const key of Object.keys(from)) {
      to[key] = key === 'opacity' || key === 'scale' ? 1 : 0;
    }
    return {
      initial: reduceMotion ? (false as const) : from,
      animate: played
        ? { ...to, ...(pulse ? { opacity: [1, 0.45, 1] } : {}) }
        : undefined,
      transition: {
        ...t(duration, delay),
        ...(pulse
          ? {
              opacity: {
                duration: PULSE_DURATION / speed,
                delay: (delay + duration) / speed,
                repeat: Infinity,
                ease: 'easeInOut' as const
              }
            }
          : {})
      }
    };
  };

  return { ref, played, reduceMotion, speed, t, staggerOr, reveal };
}

// --- Text measurement and wrapping -----------------------------------------
//
// SVG <text> does not wrap, so every label that could outgrow its box has to
// be broken into lines up front and the box sized around the result. Widths
// are estimated per character (no DOM measurement — this has to run during
// render, on the server too), which is approximate but reliably conservative
// enough to keep text inside its box.

const NARROW = new Set(' .,:;\'"!|ijlt()[]{}/\\-fr');
const WIDE = new Set('mwMW@%');

/** Strip inline markup so it isn't counted as visible characters. */
function stripMarkup(text: string): string {
  return text
    .replace(/<\/?(b|strong|i|em|u|br\s*\/?)>/gi, '')
    .replace(/\*/g, '');
}

/** Estimated rendered width of `text` in px at `fontSize`. */
export function measureText(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of stripMarkup(text)) {
    if (NARROW.has(ch)) em += 0.31;
    else if (WIDE.has(ch)) em += 0.92;
    else if (ch >= 'A' && ch <= 'Z') em += 0.66;
    else if (ch >= '0' && ch <= '9') em += 0.57;
    else em += 0.53;
  }
  return em * fontSize;
}

/** Convert paired markdown emphasis to tags, so wrapping only has to keep
 *  tags balanced. Unpaired `*` is left literal, matching rich-text's rule. */
function normalizeMarkup(text: string): string {
  let out = text;
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<i>$2</i>');
  return out;
}

const TAG_RE = /<(\/?)(b|strong|i|em|u)>/gi;

/** Close any tags still open at the end of each line and reopen them on the
 *  next one, so a wrapped **bold phrase** stays bold across the break. */
function balanceTags(lines: string[]): string[] {
  const out: string[] = [];
  let carry: string[] = [];
  for (const line of lines) {
    const open = [...carry];
    const prefix = carry.map((t) => `<${t}>`).join('');
    for (const m of line.matchAll(TAG_RE)) {
      const tag = m[2].toLowerCase();
      if (m[1]) {
        const at = open.lastIndexOf(tag);
        if (at >= 0) open.splice(at, 1);
      } else open.push(tag);
    }
    const suffix = [...open]
      .reverse()
      .map((t) => `</${t}>`)
      .join('');
    out.push(prefix + line + suffix);
    carry = open;
  }
  return out;
}

/**
 * Greedily break `text` into lines that fit `maxWidth` at `fontSize`.
 * Honors explicit `<br>` breaks, keeps inline markup balanced per line, and
 * hard-splits any single word too long to fit on its own.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const lines: string[] = [];
  for (const chunk of normalizeMarkup(text).split(/<br\s*\/?>/i)) {
    let cur = '';
    for (const word of chunk.trim().split(/\s+/)) {
      if (!word) continue;
      const candidate = cur ? `${cur} ${word}` : word;
      if (!cur || measureText(candidate, fontSize) <= maxWidth) {
        cur = candidate;
        continue;
      }
      lines.push(cur);
      cur = word;
    }
    // A single unbreakable token (a long URL, a hash) still has to fit.
    for (const line of cur ? [cur] : []) {
      if (measureText(line, fontSize) <= maxWidth || line.includes(' ')) {
        lines.push(line);
        continue;
      }
      const perChar = measureText(line, fontSize) / line.length;
      const chunkLen = Math.max(1, Math.floor(maxWidth / perChar));
      for (let i = 0; i < line.length; i += chunkLen) {
        lines.push(line.slice(i, i + chunkLen));
      }
    }
  }
  return balanceTags(lines.length ? lines : ['']);
}

/** Height of a wrapped block, for sizing the box around it. */
export function blockHeight(lineCount: number, lineHeight: number): number {
  return Math.max(1, lineCount) * lineHeight;
}

interface TextBlockProps {
  lines: string[];
  x: number;
  /** Baseline of the first line. */
  y: number;
  lineHeight: number;
  fontSize: number;
  anchor?: 'start' | 'middle' | 'end';
  fontWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/** A pre-wrapped run of SVG text, one <tspan> per line. */
export function TextBlock({
  lines,
  x,
  y,
  lineHeight,
  fontSize,
  anchor = 'middle',
  fontWeight,
  className,
  style
}: TextBlockProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={fontSize}
      fontWeight={fontWeight}
      className={className}
      style={style}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {richInline(line)}
        </tspan>
      ))}
    </text>
  );
}

/** Rounded right-angle connector between two points, bending at the midpoint
 *  of the horizontal run. Straight line when the points share a y. */
export function elbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r = 8
): string {
  if (Math.abs(y2 - y1) < 0.5) return `M ${x1} ${y1} H ${x2}`;
  const mx = (x1 + x2) / 2;
  const dy = Math.sign(y2 - y1);
  const dx = Math.sign(x2 - x1);
  const rr = Math.min(r, Math.abs(y2 - y1) / 2, Math.abs(mx - x1));
  return [
    `M ${x1} ${y1}`,
    `H ${mx - dx * rr}`,
    `Q ${mx} ${y1} ${mx} ${y1 + dy * rr}`,
    `V ${y2 - dy * rr}`,
    `Q ${mx} ${y2} ${mx + dx * rr} ${y2}`,
    `H ${x2}`
  ].join(' ');
}

/** Vertical-first elbow: leaves the source going up/down, arrives horizontally. */
export function elbowVertical(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r = 8
): string {
  if (Math.abs(x2 - x1) < 0.5) return `M ${x1} ${y1} V ${y2}`;
  const my = (y1 + y2) / 2;
  const dy = Math.sign(y2 - y1);
  const dx = Math.sign(x2 - x1);
  const rr = Math.min(r, Math.abs(x2 - x1) / 2, Math.abs(my - y1));
  return [
    `M ${x1} ${y1}`,
    `V ${my - dy * rr}`,
    `Q ${x1} ${my} ${x1 + dx * rr} ${my}`,
    `H ${x2 - dx * rr}`,
    `Q ${x2} ${my} ${x2} ${my + dy * rr}`,
    `V ${y2}`
  ].join(' ');
}

interface DiagramFigureProps {
  /** Short heading drawn above the diagram. */
  title?: string;
  /** Footnote drawn below the diagram, for caveats or scope notes. */
  caption?: string;
  align?: DiagramAlign;
  children: ReactNode;
}

/** Title/caption chrome around a diagram SVG. Rendered as HTML rather than
 *  SVG text so long headings wrap and stay selectable. */
export function DiagramFigure({
  title,
  caption,
  align = 'center',
  children
}: DiagramFigureProps) {
  if (!title && !caption) return <>{children}</>;
  const textAlign =
    align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  return (
    <figure className="mdx-figure">
      {title && (
        <p className="mdx-diagram-title" style={{ textAlign }}>
          {richHtml(title)}
        </p>
      )}
      {children}
      {caption && (
        <figcaption className="mdx-figcaption" style={{ textAlign }}>
          <span className="mdx-figcaption-label">{richHtml(caption)}</span>
        </figcaption>
      )}
    </figure>
  );
}
