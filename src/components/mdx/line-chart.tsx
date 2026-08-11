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
  type DiagramActionsOption,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';

interface LineSeries {
  label: string;
  /** One value per x label. `null` breaks the line for a missing reading. */
  values: (number | null)[];
  color?: DiagramColor;
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
}

interface LineChartProps {
  /** X axis ticks — dates, versions, releases. */
  labels: string[];
  series: LineSeries[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Appended to the y-axis values, e.g. "ms" or "%". */
  unit?: string;
  /** Axis bounds. Both default to the data, with the floor at 0. */
  min?: number;
  max?: number;
  animate?: DiagramMotion;
  align?: DiagramAlign;
  actions?: DiagramActionsOption;
  className?: string;
}

const PLOT_W = 380;
const PLOT_H = 220;
const PAD_LEFT = 62;
const PAD_RIGHT = 20;
const PAD_TOP = 16;
const PAD_BOTTOM = 40;
const WIDTH = PAD_LEFT + PLOT_W + PAD_RIGHT;
const LEGEND_ROW = 20;
const STAGGER = 0.16;

const format = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');

export function LineChart({
  labels,
  series,
  ariaLabel,
  title,
  caption,
  unit,
  min,
  max,
  animate,
  align,
  actions,
  className
}: LineChartProps) {
  const { ref, played, reduceMotion, reveal, staggerOr, t } =
    useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const numbers = series.flatMap((s) =>
    s.values.filter((v): v is number => v !== null)
  );
  const floor = min ?? Math.min(0, ...numbers);
  const ceiling = max ?? Math.max(...numbers, 1);
  const span = ceiling - floor || 1;

  const legendHeight = series.length > 1 ? series.length * LEGEND_ROW + 10 : 0;
  const height = PAD_TOP + PLOT_H + PAD_BOTTOM + legendHeight;

  const px = (i: number) =>
    PAD_LEFT +
    (labels.length === 1 ? PLOT_W / 2 : (i / (labels.length - 1)) * PLOT_W);
  const py = (v: number) => PAD_TOP + PLOT_H - ((v - floor) / span) * PLOT_H;

  /** Split on nulls so a gap in the data is a gap in the line, not a jump. */
  const pathFor = (values: (number | null)[]) => {
    const parts: string[] = [];
    let open = false;
    values.forEach((v, i) => {
      if (v === null) {
        open = false;
        return;
      }
      parts.push(`${open ? 'L' : 'M'} ${px(i)} ${py(v)}`);
      open = true;
    });
    return parts.join(' ');
  };

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {[0, 0.5, 1].map((r) => (
        <g key={r}>
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + PLOT_H * r}
            x2={PAD_LEFT + PLOT_W}
            y2={PAD_TOP + PLOT_H * r}
            strokeWidth="1"
            strokeDasharray={r === 1 ? undefined : '4 4'}
            className="stroke-border"
          />
          <text
            x={PAD_LEFT - 8}
            y={PAD_TOP + PLOT_H * r + 4}
            textAnchor="end"
            fontSize="10.5"
            className="fill-muted-foreground"
          >
            {format(ceiling - span * r)}
            {unit ?? ''}
          </text>
        </g>
      ))}

      {labels.map((label, i) => (
        <TextBlock
          key={i}
          lines={wrapText(label, PLOT_W / labels.length + 16, 10.5)}
          x={px(i)}
          y={PAD_TOP + PLOT_H + 16}
          lineHeight={12}
          fontSize={10.5}
          anchor={
            i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'
          }
          className="fill-muted-foreground"
        />
      ))}

      {series.map((line, i) => {
        const color = cycleColor(i, line.color);
        const delay = i * stagger;
        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.35,
              delay,
              pulse: line.pulse
            })}
          >
            <motion.path
              d={pathFor(line.values)}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ stroke: 'var(--mn-color)' }}
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={played ? { pathLength: 1 } : undefined}
              transition={t(0.7, delay)}
            />
            {line.values.map((v, vi) =>
              v === null ? null : (
                <circle
                  key={vi}
                  cx={px(vi)}
                  cy={py(v)}
                  r="3.5"
                  strokeWidth="1.5"
                  style={{
                    fill: 'var(--color-background)',
                    stroke: 'var(--mn-color)'
                  }}
                />
              )
            )}
          </motion.g>
        );
      })}

      {series.length > 1 &&
        series.map((line, i) => {
          const y = PAD_TOP + PLOT_H + PAD_BOTTOM + i * LEGEND_ROW - 6;
          return (
            <motion.g
              key={`legend-${i}`}
              {...colorProps(cycleColor(i, line.color))}
              {...reveal({
                from: { opacity: 0 },
                duration: 0.3,
                delay: 0.3 + i * 0.08
              })}
            >
              <line
                x1={PAD_LEFT}
                y1={y + 5}
                x2={PAD_LEFT + 16}
                y2={y + 5}
                strokeWidth="2"
                strokeLinecap="round"
                style={{ stroke: 'var(--mn-color)' }}
              />
              <text
                x={PAD_LEFT + 24}
                y={y + 9}
                fontSize="11.5"
                className="fill-foreground"
              >
                {line.label}
              </text>
            </motion.g>
          );
        })}
    </svg>
  );

  return (
    <DiagramFigure
      title={title}
      caption={caption}
      align={align}
      actions={actions}
      label={ariaLabel}
    >
      {svg}
    </DiagramFigure>
  );
}
