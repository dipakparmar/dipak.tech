'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  cycleColor,
  DiagramFigure,
  svgLayout,
  TextBlock,
  useReveal,
  wrapText,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';
import { richInline } from './rich-text';

interface QuadrantItem {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** 0 (left) to 1 (right). */
  x: number;
  /** 0 (bottom) to 1 (top). */
  y: number;
  color?: DiagramColor;
}

interface QuadrantDiagramProps {
  /** Axis end labels — what low and high mean on each axis. */
  xAxis: { left: string; right: string };
  yAxis: { bottom: string; top: string };
  items: QuadrantItem[];
  /** Optional names for the four cells, clockwise from top-left. */
  quadrants?: {
    topLeft?: string;
    topRight?: string;
    bottomRight?: string;
    bottomLeft?: string;
  };
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const PLOT = 320;
const PAD_LEFT = 76;
const PAD_RIGHT = 76;
const PAD_TOP = 26;
const PAD_BOTTOM = 26;
const WIDTH = PAD_LEFT + PLOT + PAD_RIGHT;
const HEIGHT = PAD_TOP + PLOT + PAD_BOTTOM;
const DOT_R = 5;
const STAGGER = 0.07;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function QuadrantDiagram({
  xAxis,
  yAxis,
  items,
  quadrants,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  className
}: QuadrantDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const px = (x: number) => PAD_LEFT + clamp01(x) * PLOT;
  const py = (y: number) => PAD_TOP + (1 - clamp01(y)) * PLOT;
  const midX = PAD_LEFT + PLOT / 2;
  const midY = PAD_TOP + PLOT / 2;

  const cellLabels: Array<[string | undefined, number, number]> = [
    [quadrants?.topLeft, PAD_LEFT + 10, PAD_TOP + 18],
    [quadrants?.topRight, PAD_LEFT + PLOT - 10, PAD_TOP + 18],
    [quadrants?.bottomLeft, PAD_LEFT + 10, PAD_TOP + PLOT - 10],
    [quadrants?.bottomRight, PAD_LEFT + PLOT - 10, PAD_TOP + PLOT - 10]
  ];

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <rect
        x={PAD_LEFT}
        y={PAD_TOP}
        width={PLOT}
        height={PLOT}
        rx="8"
        fill="none"
        strokeWidth="1"
        className="stroke-border"
      />
      <line
        x1={midX}
        y1={PAD_TOP}
        x2={midX}
        y2={PAD_TOP + PLOT}
        strokeWidth="1"
        strokeDasharray="4 4"
        className="stroke-border"
      />
      <line
        x1={PAD_LEFT}
        y1={midY}
        x2={PAD_LEFT + PLOT}
        y2={midY}
        strokeWidth="1"
        strokeDasharray="4 4"
        className="stroke-border"
      />

      {cellLabels.map(([label, x, y], i) =>
        label ? (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={i % 2 === 0 ? 'start' : 'end'}
            fontSize="10"
            letterSpacing="0.1em"
            className="fill-muted-foreground"
          >
            {label.toUpperCase()}
          </text>
        ) : null
      )}

      <text
        x={PAD_LEFT - 8}
        y={midY + 4}
        textAnchor="end"
        fontSize="11.5"
        className="fill-muted-foreground"
      >
        {richInline(xAxis.left)}
      </text>
      <text
        x={PAD_LEFT + PLOT + 8}
        y={midY + 4}
        fontSize="11.5"
        className="fill-muted-foreground"
      >
        {richInline(xAxis.right)}
      </text>
      <text
        x={midX}
        y={PAD_TOP - 10}
        textAnchor="middle"
        fontSize="11.5"
        className="fill-muted-foreground"
      >
        {richInline(yAxis.top)}
      </text>
      <text
        x={midX}
        y={PAD_TOP + PLOT + 18}
        textAnchor="middle"
        fontSize="11.5"
        className="fill-muted-foreground"
      >
        {richInline(yAxis.bottom)}
      </text>

      {items.map((item, i) => {
        const cx = px(item.x);
        const cy = py(item.y);
        // Flip the label to the left of the dot near the right edge so it
        // doesn't run out of the plot.
        const flip = item.x > 0.62;
        const labelX = flip ? cx - DOT_R - 6 : cx + DOT_R + 6;
        const lines = wrapText(
          item.label,
          flip ? labelX - 6 : WIDTH - labelX - 6,
          11.5
        );

        return (
          <motion.g
            key={i}
            {...colorProps(cycleColor(i, item.color))}
            {...reveal({
              from: { opacity: 0, scale: 0.6 },
              duration: 0.35,
              delay: 0.2 + i * stagger,
              pulse: item.pulse
            })}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <circle
              cx={cx}
              cy={cy}
              r={DOT_R}
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={lines}
              x={labelX}
              y={cy - (lines.length - 1) * 6 + 4}
              lineHeight={12}
              fontSize={11.5}
              anchor={flip ? 'end' : 'start'}
              className="fill-foreground"
            />
          </motion.g>
        );
      })}
    </svg>
  );

  return (
    <DiagramFigure title={title} caption={caption} align={align}>
      {svg}
    </DiagramFigure>
  );
}
