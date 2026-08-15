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

interface ScatterPoint {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  x: number;
  y: number;
  /** Printed beside the dot. Leave it off for dense clouds. */
  label?: string;
  color?: DiagramColor;
}

interface Axis {
  label: string;
  min?: number;
  max?: number;
  /** Appended to the tick values, e.g. "ms" or "%". */
  unit?: string;
}

interface ScatterPlotProps {
  points: ScatterPoint[];
  xAxis: Axis;
  yAxis: Axis;
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Draw a least-squares trend line through the points. */
  trend?: boolean;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const PLOT_W = 360;
const PLOT_H = 260;
const PAD_LEFT = 62;
const PAD_RIGHT = 24;
const PAD_TOP = 18;
const PAD_BOTTOM = 52;
const WIDTH = PAD_LEFT + PLOT_W + PAD_RIGHT;
const HEIGHT = PAD_TOP + PLOT_H + PAD_BOTTOM;
const DOT_R = 4.5;

const tick = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');

/** Least-squares fit; null when the points are vertical or too few. */
function fit(points: ScatterPoint[]) {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / den;
  return { slope, intercept: my - slope * mx };
}
const STAGGER = 0.04;

export function ScatterPlot({
  points,
  xAxis,
  yAxis,
  ariaLabel,
  title,
  caption,
  trend = false,
  animate,
  align,
  className
}: ScatterPlotProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const xMin = xAxis.min ?? Math.min(...points.map((p) => p.x), 0);
  const xMax = xAxis.max ?? Math.max(...points.map((p) => p.x), 1);
  const yMin = yAxis.min ?? Math.min(...points.map((p) => p.y), 0);
  const yMax = yAxis.max ?? Math.max(...points.map((p) => p.y), 1);
  const px = (x: number) =>
    PAD_LEFT + ((x - xMin) / (xMax - xMin || 1)) * PLOT_W;
  const py = (y: number) =>
    PAD_TOP + PLOT_H - ((y - yMin) / (yMax - yMin || 1)) * PLOT_H;

  const line = trend ? fit(points) : null;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id="scatter-plot-area">
          <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
        </clipPath>
      </defs>
      {[0, 0.5, 1].map((r) => (
        <line
          key={`h${r}`}
          x1={PAD_LEFT}
          y1={PAD_TOP + PLOT_H * r}
          x2={PAD_LEFT + PLOT_W}
          y2={PAD_TOP + PLOT_H * r}
          strokeWidth="1"
          strokeDasharray={r === 1 ? undefined : '4 4'}
          className="stroke-border"
        />
      ))}
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP}
        x2={PAD_LEFT}
        y2={PAD_TOP + PLOT_H}
        strokeWidth="1"
        className="stroke-border"
      />

      {[
        [yMax, PAD_TOP + 4],
        [(yMax + yMin) / 2, PAD_TOP + PLOT_H / 2 + 4],
        [yMin, PAD_TOP + PLOT_H + 4]
      ].map(([value, y], i) => (
        <text
          key={i}
          x={PAD_LEFT - 8}
          y={y}
          textAnchor="end"
          fontSize="10.5"
          className="fill-muted-foreground"
        >
          {tick(value)}
          {yAxis.unit ?? ''}
        </text>
      ))}
      {[
        [xMin, PAD_LEFT],
        [xMax, PAD_LEFT + PLOT_W]
      ].map(([value, x], i) => (
        <text
          key={i}
          x={x}
          y={PAD_TOP + PLOT_H + 16}
          textAnchor={i === 0 ? 'start' : 'end'}
          fontSize="10.5"
          className="fill-muted-foreground"
        >
          {tick(value)}
          {xAxis.unit ?? ''}
        </text>
      ))}

      <TextBlock
        lines={wrapText(xAxis.label, PLOT_W, 11.5)}
        x={PAD_LEFT + PLOT_W / 2}
        y={HEIGHT - 14}
        lineHeight={13}
        fontSize={11.5}
        className="fill-muted-foreground"
      />
      <text
        x={16}
        y={PAD_TOP + PLOT_H / 2}
        fontSize="11.5"
        textAnchor="middle"
        className="fill-muted-foreground"
        transform={`rotate(-90 16 ${PAD_TOP + PLOT_H / 2})`}
      >
        {yAxis.label}
      </text>

      {line && (
        <motion.line
          clipPath="url(#scatter-plot-area)"
          x1={px(xMin)}
          y1={py(line.slope * xMin + line.intercept)}
          x2={px(xMax)}
          y2={py(line.slope * xMax + line.intercept)}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className="stroke-muted-foreground"
          {...reveal({ from: { pathLength: 0 }, duration: 0.6, delay: 0.4 })}
        />
      )}

      {points.map((point, i) => {
        const cx = px(point.x);
        const cy = py(point.y);
        const flip = cx > PAD_LEFT + PLOT_W * 0.7;
        const labelX = flip ? cx - DOT_R - 5 : cx + DOT_R + 5;

        return (
          <motion.g
            key={i}
            {...colorProps(cycleColor(i, point.color))}
            {...reveal({
              from: { opacity: 0, scale: 0.5 },
              duration: 0.3,
              delay: 0.1 + i * stagger,
              pulse: point.pulse
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
            {point.label && (
              <TextBlock
                lines={wrapText(
                  point.label,
                  flip ? labelX - PAD_LEFT : WIDTH - labelX - 4,
                  10.5
                )}
                x={labelX}
                y={cy + 3.5}
                lineHeight={12}
                fontSize={10.5}
                anchor={flip ? 'end' : 'start'}
                className="fill-foreground"
              />
            )}
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
