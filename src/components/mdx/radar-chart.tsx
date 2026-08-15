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

interface RadarSeries {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** One value per axis, in the same order as `axes`. */
  values: number[];
  color?: DiagramColor;
}

interface RadarChartProps {
  /** 3 to 6 axes. Fewer than 3 has no area; more than 6 gets unreadable. */
  axes: string[];
  series: RadarSeries[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Scale maximum. Defaults to the largest value across all series. */
  max?: number;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const RADIUS = 118;
const PAD = 96;
const RINGS = 4;
const AXIS_LABEL_GAP = 16;
const LEGEND_ROW = 20;
const STAGGER = 0.18;

export function RadarChart({
  axes,
  series,
  ariaLabel,
  title,
  caption,
  max,
  animate,
  align,
  className
}: RadarChartProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const ceiling = Math.max(max ?? 0, ...series.flatMap((s) => s.values), 1);
  const cx = PAD + RADIUS;
  const cy = PAD + RADIUS;
  const width = cx * 2;
  const legendHeight = series.length > 1 ? series.length * LEGEND_ROW + 12 : 0;
  const height = cy * 2 + legendHeight;

  const angleFor = (i: number) =>
    -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const point = (i: number, ratio: number) => ({
    x: cx + RADIUS * ratio * Math.cos(angleFor(i)),
    y: cy + RADIUS * ratio * Math.sin(angleFor(i))
  });
  const polygon = (values: number[]) =>
    values
      .map((v, i) => {
        const p = point(i, Math.max(0, Math.min(1, v / ceiling)));
        return `${p.x},${p.y}`;
      })
      .join(' ');

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {Array.from({ length: RINGS }, (_, r) => (
        <polygon
          key={r}
          points={polygon(axes.map(() => (ceiling * (r + 1)) / RINGS))}
          fill="none"
          strokeWidth="1"
          className="stroke-border"
        />
      ))}
      {axes.map((_, i) => {
        const p = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            strokeWidth="1"
            className="stroke-border"
          />
        );
      })}

      {axes.map((axis, i) => {
        const p = point(i, 1);
        const dx = p.x - cx;
        const dy = p.y - cy;
        const lx = p.x + (dx / RADIUS) * AXIS_LABEL_GAP;
        const ly = p.y + (dy / RADIUS) * AXIS_LABEL_GAP;
        const anchor = Math.abs(dx) < 12 ? 'middle' : dx > 0 ? 'start' : 'end';
        const lines = wrapText(axis, PAD - 12, 11.5);
        return (
          <TextBlock
            key={i}
            lines={lines}
            x={lx}
            y={ly + (dy > 12 ? 9 : dy < -12 ? -2 : 4) - (lines.length - 1) * 6}
            lineHeight={13}
            fontSize={11.5}
            anchor={anchor}
            className="fill-muted-foreground"
          />
        );
      })}

      {series.map((s, i) => {
        const color = cycleColor(i, s.color);
        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({
              from: { opacity: 0, scale: 0.85 },
              duration: 0.5,
              delay: i * stagger,
              pulse: s.pulse
            })}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon
              points={polygon(s.values)}
              strokeWidth="1.5"
              style={{
                fill: 'var(--mn-color)',
                fillOpacity: 0.16,
                stroke: 'var(--mn-color)'
              }}
            />
            {s.values.map((v, vi) => {
              const p = point(vi, Math.max(0, Math.min(1, v / ceiling)));
              return (
                <circle
                  key={vi}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  style={{ fill: 'var(--mn-color)' }}
                />
              );
            })}
          </motion.g>
        );
      })}

      {series.length > 1 &&
        series.map((s, i) => {
          const y = cy * 2 + 8 + i * LEGEND_ROW;
          return (
            <motion.g
              key={`legend-${i}`}
              {...colorProps(cycleColor(i, s.color))}
              {...reveal({
                from: { opacity: 0 },
                duration: 0.3,
                delay: 0.3 + i * 0.08
              })}
            >
              <rect
                x={PAD}
                y={y}
                width={10}
                height={10}
                rx="2"
                strokeWidth="1.5"
                style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
              />
              <text
                x={PAD + 18}
                y={y + 9}
                fontSize="11.5"
                className="fill-foreground"
              >
                {s.label}
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
