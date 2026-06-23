'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

// Keys resolved by CSS in globals.css (.flow-diagram [data-color="..."]),
// not Tailwind classes — content/blog/*.mdx isn't in tailwind.config.ts's
// content globs, so a class only ever written inside an .mdx file would
// silently get tree-shaken out. Plain CSS attribute selectors don't have
// that problem, which is also why Highlighter/MarginNote use the same trick.
export type FlowColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'info' | 'tip' | 'warning' | 'danger' | 'purple';

type ArrowText = string | [string, string];
type FlowNode = string | { label: string; color?: FlowColor; children?: string[] };
type FlowArrow = ArrowText | { label: ArrowText; color?: FlowColor };

interface FlowDiagramProps {
  /** Node labels, top to bottom. Pass a string for the default color cycle, or an object to pin a color or add a cluster of sub-boxes. */
  nodes: FlowNode[];
  /** One entry per gap between nodes (nodes.length - 1 entries). A [line1, line2] tuple wraps onto two lines. */
  arrows?: FlowArrow[];
  ariaLabel: string;
  /** Short heading drawn above the diagram. */
  title?: string;
  /** Footnote drawn below the diagram, for caveats or scope notes. */
  caption?: string;
  /** Pulse the last node forever once it's revealed, to signal a recurring cycle. */
  pulseLast?: boolean;
  /** Send a small dot traveling down each arrow on a loop, to signal the chain runs continuously. */
  flow?: boolean;
  className?: string;
}

const DEFAULT_CYCLE: FlowColor[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

const STAGGER = 0.55;
const NODE_HEIGHT = 40;
const CLUSTER_HEADER = 22;
const CLUSTER_CHILD_HEIGHT = 32;
const CLUSTER_PADDING = 10;
const CLUSTER_HEIGHT = CLUSTER_HEADER + CLUSTER_CHILD_HEIGHT + CLUSTER_PADDING * 2;
const GAP = 70;
const WIDTH = 440;
const NODE_WIDTH = 360;
const TITLE_HEIGHT = 30;

// A small dot travels down each arrow in sequence, on a loop, once the
// entrance animation finishes — reads as "this chain runs continuously."
const TRAVEL_DURATION = 0.6;
const NODE_PAUSE = 0.45;

function resolveNode(node: FlowNode, i: number) {
  if (typeof node === 'string') return { label: node, color: DEFAULT_CYCLE[i % DEFAULT_CYCLE.length], children: undefined as string[] | undefined };
  return { label: node.label, color: node.color ?? DEFAULT_CYCLE[i % DEFAULT_CYCLE.length], children: node.children };
}

function resolveArrow(arrow: FlowArrow, i: number) {
  const fallbackColor = DEFAULT_CYCLE[(i + 1) % DEFAULT_CYCLE.length];
  if (typeof arrow === 'string') return { lines: [arrow], color: fallbackColor };
  if (Array.isArray(arrow)) return { lines: arrow, color: fallbackColor };
  return { lines: Array.isArray(arrow.label) ? arrow.label : [arrow.label], color: arrow.color ?? fallbackColor };
}

export function FlowDiagram({ nodes, arrows, ariaLabel, title, caption, pulseLast = false, flow = true, className }: FlowDiagramProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const played = Boolean(reduceMotion) || isInView;

  const resolved = nodes.map((node, i) => resolveNode(node, i));
  const nodeHeights = resolved.map((n) => (n.children?.length ? CLUSTER_HEIGHT : NODE_HEIGHT));
  const top = 20 + (title ? TITLE_HEIGHT : 0);
  const nodeY: number[] = [];
  let cursor = top;
  nodeHeights.forEach((h, i) => {
    nodeY[i] = cursor;
    cursor += h + GAP;
  });
  const height = cursor - GAP + 20;
  const entranceDone = (nodes.length - 1) * STAGGER + 1;
  const loopPeriod = (arrows?.length ?? 0) * (TRAVEL_DURATION + NODE_PAUSE);

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      className={`flow-diagram w-full max-w-md mx-auto my-6 ${className ?? ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {arrows?.map((arrow, i) => {
          const { color } = resolveArrow(arrow, i);
          return (
            <marker key={i} id={`flow-arrow-${i}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" data-color={color} style={{ fill: 'var(--mn-color)' }} />
            </marker>
          );
        })}
      </defs>

      {title && (
        <text x={WIDTH / 2} y="20" textAnchor="middle" fontSize="14" fontWeight="600" className="fill-foreground">
          {title}
        </text>
      )}

      {resolved.map(({ label, color, children }, i) => {
        const delay = i * STAGGER;
        const isLast = pulseLast && i === nodes.length - 1;
        const y = nodeY[i];
        const boxHeight = nodeHeights[i];

        return (
          <motion.g
            key={label}
            data-color={color}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={played ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.45, ease: 'easeOut', delay }}
          >
            <rect
              x={(WIDTH - NODE_WIDTH) / 2}
              y={y}
              width={NODE_WIDTH}
              height={boxHeight}
              rx="6"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <text x={WIDTH / 2} y={y + (children?.length ? 17 : 25)} textAnchor="middle" fontSize="13" fontWeight="600" className="fill-foreground">
              {label}
            </text>
            {children?.length && (
              <ChildRow x={(WIDTH - NODE_WIDTH) / 2} y={y + CLUSTER_HEADER} width={NODE_WIDTH} labels={children} />
            )}
            {isLast && (
              <motion.rect
                x={(WIDTH - NODE_WIDTH) / 2 - 5}
                y={y - 5}
                width={NODE_WIDTH + 10}
                height={boxHeight + 10}
                rx="10"
                strokeWidth="0"
                style={{ fill: 'var(--mn-color)', transformOrigin: 'center', filter: 'url(#flow-glow)' }}
                initial={{ opacity: 0.5, scale: 1 }}
                animate={played ? { opacity: [0.5, 0, 0.5], scale: [1, 1.08, 1] } : undefined}
                transition={{ duration: 1.8, ease: 'easeInOut', delay: delay + 0.5, repeat: Infinity }}
              />
            )}
          </motion.g>
        );
      })}

      {arrows?.map((arrow, i) => {
        const { lines, color } = resolveArrow(arrow, i);
        const delay = i * STAGGER + 0.3;
        const y1 = nodeY[i] + nodeHeights[i];
        const y2 = nodeY[i + 1];
        const textX = WIDTH / 2 + 12;

        return (
          <motion.g
            key={lines[0]}
            data-color={color}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={played ? { opacity: 1 } : undefined}
            transition={{ duration: 0.45, ease: 'easeOut', delay }}
          >
            <motion.path
              d={`M ${WIDTH / 2} ${y1} L ${WIDTH / 2} ${y2}`}
              fill="none"
              strokeWidth="1.5"
              style={{ stroke: 'var(--mn-color)' }}
              markerEnd={`url(#flow-arrow-${i})`}
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={played ? { pathLength: 1 } : undefined}
              transition={{ duration: 0.35, ease: 'easeOut', delay }}
            />
            {flow && !reduceMotion && played && (
              <motion.circle
                cx={WIDTH / 2}
                r="4"
                style={{ fill: 'var(--mn-color)' }}
                initial={{ cy: y1, opacity: 0 }}
                animate={{ cy: [y1, y1, y2, y2], opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: TRAVEL_DURATION,
                  times: [0, 0.08, 0.92, 1],
                  ease: 'easeInOut',
                  delay: entranceDone + i * (TRAVEL_DURATION + NODE_PAUSE),
                  repeat: Infinity,
                  repeatDelay: loopPeriod - TRAVEL_DURATION
                }}
              />
            )}
            <text x={textX} y={(y1 + y2) / 2 - (lines.length > 1 ? 4 : -3)} fontSize="10" className="fill-muted-foreground">
              {lines.map((line, li) => (
                <tspan key={li} x={textX} dy={li === 0 ? 0 : 12}>
                  {line}
                </tspan>
              ))}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );

  if (!caption) return svg;
  return (
    <figure className="mdx-figure">
      {svg}
      <figcaption className="mdx-figcaption">
        <span className="mdx-figcaption-label">{caption}</span>
      </figcaption>
    </figure>
  );
}

function ChildRow({ x, y, width, labels }: { x: number; y: number; width: number; labels: string[] }) {
  const padding = 8;
  const gap = 6;
  const innerWidth = width - padding * 2;
  const childWidth = (innerWidth - gap * (labels.length - 1)) / labels.length;

  return (
    <>
      {labels.map((label, i) => {
        const cx = x + padding + i * (childWidth + gap);
        return (
          <g key={label}>
            <rect x={cx} y={y} width={childWidth} height={CLUSTER_CHILD_HEIGHT} rx="4" className="fill-muted stroke-border" strokeWidth="1" />
            <text x={cx + childWidth / 2} y={y + CLUSTER_CHILD_HEIGHT / 2 + 4} textAnchor="middle" fontSize="9.5" className="fill-muted-foreground">
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}
