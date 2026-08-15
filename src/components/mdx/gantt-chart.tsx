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

interface GanttTask {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** 0-based index into `columns` where the bar starts. */
  start: number;
  /** Number of columns the bar covers. Defaults to 1. */
  span?: number;
  color?: DiagramColor;
  /** Printed after the bar — an owner, a status, a caveat. */
  note?: string;
  /** Draw a diamond at `start` instead of a bar. */
  milestone?: boolean;
}

interface GanttChartProps {
  /** Time buckets across the top — weeks, months, quarters, sprints. */
  columns: string[];
  tasks: GanttTask[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  /** Corner for the download / full-screen buttons, or `false` to hide them. */
  actions?: DiagramActionsOption;
  className?: string;
}

const PAD = 10;
const LABEL_WIDTH = 132;
const COL_WIDTH = 68;
const NOTE_WIDTH = 96;
const HEADER_HEIGHT = 26;
const BAR_HEIGHT = 20;
const ROW_GAP = 12;
const LABEL_LINE = 14;
const STAGGER = 0.1;

export function GanttChart({
  columns,
  tasks,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: GanttChartProps) {
  const { ref, played, reduceMotion, staggerOr, reveal } =
    useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const gridX = PAD + LABEL_WIDTH;
  const gridWidth = columns.length * COL_WIDTH;
  const hasNote = tasks.some((t) => t.note);
  const width = gridX + gridWidth + (hasNote ? NOTE_WIDTH : 0) + PAD;

  const rows = tasks.map((t) => {
    const lines = wrapText(t.label, LABEL_WIDTH - 12, 12);
    return {
      ...t,
      lines,
      height: Math.max(BAR_HEIGHT, lines.length * LABEL_LINE)
    };
  });
  const rowY: number[] = [];
  let cursor = PAD + HEADER_HEIGHT + 6;
  rows.forEach((r, i) => {
    rowY[i] = cursor;
    cursor += r.height + ROW_GAP;
  });
  const height = cursor - ROW_GAP + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {columns.map((col, i) => (
        <g key={i}>
          <line
            x1={gridX + i * COL_WIDTH}
            y1={PAD + HEADER_HEIGHT - 6}
            x2={gridX + i * COL_WIDTH}
            y2={height - PAD}
            strokeWidth="1"
            className="stroke-border"
          />
          <text
            x={gridX + i * COL_WIDTH + COL_WIDTH / 2}
            y={PAD + 12}
            textAnchor="middle"
            fontSize="10.5"
            letterSpacing="0.08em"
            className="fill-muted-foreground"
          >
            {col.toUpperCase()}
          </text>
        </g>
      ))}
      <line
        x1={gridX + gridWidth}
        y1={PAD + HEADER_HEIGHT - 6}
        x2={gridX + gridWidth}
        y2={height - PAD}
        strokeWidth="1"
        className="stroke-border"
      />

      {rows.map((task, i) => {
        const y = rowY[i] + (task.height - BAR_HEIGHT) / 2;
        const span = Math.max(1, task.span ?? 1);
        const x = gridX + task.start * COL_WIDTH;
        const barWidth = span * COL_WIDTH;
        const delay = i * stagger;

        return (
          <motion.g
            key={i}
            {...colorProps(cycleColor(i, task.color))}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.3,
              delay,
              pulse: task.pulse
            })}
          >
            <TextBlock
              lines={task.lines}
              x={gridX - 10}
              y={
                rowY[i] +
                (task.height - task.lines.length * LABEL_LINE) / 2 +
                LABEL_LINE -
                3
              }
              lineHeight={LABEL_LINE}
              fontSize={12}
              anchor="end"
              className="fill-foreground"
            />
            {task.milestone ? (
              <path
                d={`M ${x + COL_WIDTH / 2} ${y + BAR_HEIGHT / 2 - 8} l 8 8 l -8 8 l -8 -8 z`}
                strokeWidth="1.5"
                style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
              />
            ) : (
              <motion.rect
                x={x + 2}
                y={y}
                height={BAR_HEIGHT}
                rx="4"
                strokeWidth="1.5"
                style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
                initial={reduceMotion ? false : { width: 0 }}
                animate={played ? { width: barWidth - 4 } : undefined}
                width={reduceMotion ? barWidth - 4 : undefined}
                transition={{ duration: 0.5, ease: 'easeOut', delay }}
              />
            )}
            {task.note && (
              <TextBlock
                lines={wrapText(task.note, NOTE_WIDTH - 12, 10.5)}
                x={gridX + gridWidth + 10}
                y={y + BAR_HEIGHT / 2 + 4}
                lineHeight={12}
                fontSize={10.5}
                anchor="start"
                className="fill-muted-foreground"
              />
            )}
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
