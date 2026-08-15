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

interface Bar {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  value: number;
  color?: DiagramColor;
  /** Aside printed after the value — "p99", "cold start", etc. */
  note?: string;
}

interface BarChartProps {
  /** Horizontal bars, drawn in the order given. */
  bars: Bar[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Appended to every printed value, e.g. "ms" or "%". */
  unit?: string;
  /** Axis maximum. Defaults to the largest value, so bars fill the width. */
  max?: number;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const WIDTH = 520;
const PAD = 10;
const LABEL_WIDTH = 128;
const VALUE_WIDTH = 84;
const TRACK_X = PAD + LABEL_WIDTH;
const TRACK_WIDTH = WIDTH - TRACK_X - VALUE_WIDTH - PAD;
const BAR_HEIGHT = 22;
const ROW_GAP = 12;
const LABEL_LINE = 14;
const STAGGER = 0.1;

const format = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');

export function BarChart({
  bars,
  ariaLabel,
  title,
  caption,
  unit,
  max,
  animate,
  align,
  className
}: BarChartProps) {
  const { ref, played, reduceMotion, staggerOr, reveal } =
    useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const ceiling = Math.max(max ?? 0, ...bars.map((b) => b.value), 1);
  // A wrapped category label makes its own row taller rather than colliding
  // with the bar above it.
  const rows = bars.map((bar) => {
    const lines = wrapText(bar.label, LABEL_WIDTH - 12, 12);
    return {
      ...bar,
      lines,
      height: Math.max(BAR_HEIGHT, lines.length * LABEL_LINE)
    };
  });
  const rowY: number[] = [];
  let cursor = PAD;
  rows.forEach((r, i) => {
    rowY[i] = cursor;
    cursor += r.height + ROW_GAP;
  });
  const height = cursor - ROW_GAP + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <line
        x1={TRACK_X}
        y1={PAD - 4}
        x2={TRACK_X}
        y2={height - PAD + 4}
        strokeWidth="1"
        className="stroke-border"
      />

      {rows.map((bar, i) => {
        const y = rowY[i] + (bar.height - BAR_HEIGHT) / 2;
        const barWidth = Math.max(2, (bar.value / ceiling) * TRACK_WIDTH);
        const delay = i * stagger;

        return (
          <motion.g
            key={i}
            {...colorProps(cycleColor(i, bar.color))}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.3,
              delay,
              pulse: bar.pulse
            })}
          >
            <TextBlock
              lines={bar.lines}
              x={TRACK_X - 10}
              y={
                rowY[i] +
                (bar.height - bar.lines.length * LABEL_LINE) / 2 +
                LABEL_LINE -
                3
              }
              lineHeight={LABEL_LINE}
              fontSize={12}
              anchor="end"
              className="fill-foreground"
            />
            <motion.rect
              x={TRACK_X + 1}
              y={y}
              height={BAR_HEIGHT}
              rx="4"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
              initial={reduceMotion ? false : { width: 0 }}
              animate={played ? { width: barWidth } : undefined}
              width={reduceMotion ? barWidth : undefined}
              transition={{ duration: 0.6, ease: 'easeOut', delay }}
            />
            <text
              x={TRACK_X + barWidth + 10}
              y={y + BAR_HEIGHT / 2 + 4}
              fontSize="12"
              fontWeight="500"
              style={{ fill: 'var(--mn-color)' }}
            >
              {format(bar.value)}
              {unit ? <tspan fontSize="10.5">{unit}</tspan> : null}
              {bar.note ? (
                <tspan
                  fontSize="10.5"
                  fontWeight="400"
                  className="fill-muted-foreground"
                >
                  {' '}
                  {bar.note}
                </tspan>
              ) : null}
            </text>
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
