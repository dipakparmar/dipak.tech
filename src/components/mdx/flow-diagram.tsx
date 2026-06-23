'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

type ArrowLabel = string | [string, string];

interface FlowDiagramProps {
  /** Node labels, top to bottom. */
  nodes: string[];
  /** One label per gap between nodes (nodes.length - 1 entries). Use a [line1, line2] tuple to wrap onto two lines. */
  arrows?: ArrowLabel[];
  ariaLabel: string;
  /** Pulse the last node forever once it's revealed, to signal a recurring cycle. */
  pulseLast?: boolean;
  /** Send a small dot traveling down each arrow on a loop, to signal the chain runs continuously. */
  flow?: boolean;
  className?: string;
}

const STAGGER = 0.55;
const NODE_HEIGHT = 40;
const GAP = 70;
const STEP = NODE_HEIGHT + GAP;
const WIDTH = 440;
const NODE_WIDTH = 360;
// Literal class names so Tailwind's scanner picks them up — building these
// via string interpolation (e.g. `fill-chart-${i}`) would tree-shake them out.
const NODE_CLASSES = [
  'fill-chart-1/15 stroke-chart-1',
  'fill-chart-2/15 stroke-chart-2',
  'fill-chart-3/15 stroke-chart-3',
  'fill-chart-4/15 stroke-chart-4',
  'fill-chart-5/15 stroke-chart-5'
];
const RING_CLASSES = ['fill-chart-1/60', 'fill-chart-2/60', 'fill-chart-3/60', 'fill-chart-4/60', 'fill-chart-5/60'];
const LINE_CLASSES = ['stroke-chart-1', 'stroke-chart-2', 'stroke-chart-3', 'stroke-chart-4', 'stroke-chart-5'];
const DOT_CLASSES = ['fill-chart-1', 'fill-chart-2', 'fill-chart-3', 'fill-chart-4', 'fill-chart-5'];

// A small dot travels down each arrow in sequence, on a loop, once the
// entrance animation finishes — reads as "this chain runs continuously."
const TRAVEL_DURATION = 0.6;
const NODE_PAUSE = 0.45;

export function FlowDiagram({ nodes, arrows, ariaLabel, pulseLast = false, flow = true, className }: FlowDiagramProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const played = Boolean(reduceMotion) || isInView;

  const height = nodes.length * STEP - GAP + 40;
  const markerId = 'flow-arrow';
  const entranceDone = (nodes.length - 1) * STAGGER + 1;
  const loopPeriod = (arrows?.length ?? 0) * (TRAVEL_DURATION + NODE_PAUSE);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      className={`w-full max-w-md mx-auto my-6 ${className ?? ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
        </marker>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {nodes.map((label, i) => {
        const delay = i * STAGGER;
        const isLast = pulseLast && i === nodes.length - 1;
        const y = 20 + i * STEP;
        const nodeClass = NODE_CLASSES[i % NODE_CLASSES.length];
        const ringClass = RING_CLASSES[i % RING_CLASSES.length];

        return (
          <motion.g
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={played ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.45, ease: 'easeOut', delay }}
          >
            <rect x={(WIDTH - NODE_WIDTH) / 2} y={y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="6" strokeWidth="1.5" className={nodeClass} />
            <text x={WIDTH / 2} y={y + 25} textAnchor="middle" fontSize="13" fontWeight="600" className="fill-foreground">
              {label}
            </text>
            {isLast && (
              <motion.rect
                x={(WIDTH - NODE_WIDTH) / 2 - 5}
                y={y - 5}
                width={NODE_WIDTH + 10}
                height={NODE_HEIGHT + 10}
                rx="10"
                strokeWidth="0"
                className={ringClass}
                initial={{ opacity: 0.7, scale: 1 }}
                animate={played ? { opacity: [0.7, 0, 0.7], scale: [1, 1.08, 1] } : undefined}
                transition={{ duration: 1.8, ease: 'easeInOut', delay: delay + 0.5, repeat: Infinity }}
                style={{ transformOrigin: 'center', filter: 'url(#flow-glow)' }}
              />
            )}
          </motion.g>
        );
      })}

      {arrows?.map((label, i) => {
        const delay = i * STAGGER + 0.3;
        const lines = Array.isArray(label) ? label : [label];
        const y1 = 20 + i * STEP + NODE_HEIGHT;
        const y2 = y1 + GAP;
        const lineClass = LINE_CLASSES[(i + 1) % LINE_CLASSES.length];
        const dotClass = DOT_CLASSES[(i + 1) % DOT_CLASSES.length];
        const textX = WIDTH / 2 + 12;

        return (
          <motion.g
            key={lines[0]}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={played ? { opacity: 1 } : undefined}
            transition={{ duration: 0.45, ease: 'easeOut', delay }}
          >
            <motion.path
              d={`M ${WIDTH / 2} ${y1} L ${WIDTH / 2} ${y2}`}
              fill="none"
              strokeWidth="1.5"
              className={lineClass}
              markerEnd={`url(#${markerId})`}
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={played ? { pathLength: 1 } : undefined}
              transition={{ duration: 0.35, ease: 'easeOut', delay }}
            />
            {flow && !reduceMotion && played && (
              <motion.circle
                cx={WIDTH / 2}
                r="4"
                className={dotClass}
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
}
