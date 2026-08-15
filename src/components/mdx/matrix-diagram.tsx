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

/** `true`/`false` render as a tick or a cross; a string prints as-is;
 *  `null` is an explicit "not applicable" dash. */
type Cell = boolean | string | null;

interface MatrixRow {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** One entry per column, in order. Missing entries render as a dash. */
  cells: Cell[];
  color?: DiagramColor;
}

interface MatrixDiagramProps {
  /** Column headers — roles, environments, plans, components. */
  columns: string[];
  rows: MatrixRow[];
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
const LABEL_WIDTH = 150;
const COL_WIDTH = 92;
const HEADER_LINE = 13;
const HEADER_PAD = 10;
const ROW_LINE = 15;
const ROW_PAD = 9;
const MIN_ROW_HEIGHT = 34;
const STAGGER = 0.07;

export function MatrixDiagram({
  columns,
  rows,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: MatrixDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const gridX = PAD + LABEL_WIDTH;
  const width = gridX + columns.length * COL_WIDTH + PAD;

  const headerLines = columns.map((c) => wrapText(c, COL_WIDTH - 14, 11));
  const headerHeight =
    HEADER_PAD * 2 +
    Math.max(...headerLines.map((l) => l.length)) * HEADER_LINE;

  const body = rows.map((row, i) => {
    const labelLines = wrapText(row.label, LABEL_WIDTH - 14, 12.5);
    const cellLines = columns.map((_, ci) => {
      const cell = row.cells[ci];
      return typeof cell === 'string'
        ? wrapText(cell, COL_WIDTH - 14, 11.5)
        : [];
    });
    return {
      ...row,
      color: cycleColor(i, row.color),
      labelLines,
      cellLines,
      height: Math.max(
        MIN_ROW_HEIGHT,
        ROW_PAD * 2 +
          Math.max(labelLines.length, ...cellLines.map((l) => l.length || 1)) *
            ROW_LINE
      )
    };
  });

  const rowY: number[] = [];
  let cursor = PAD + headerHeight;
  body.forEach((r, i) => {
    rowY[i] = cursor;
    cursor += r.height;
  });
  const height = cursor + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {columns.map((_, i) => (
        <line
          key={`v${i}`}
          x1={gridX + i * COL_WIDTH}
          y1={PAD + 4}
          x2={gridX + i * COL_WIDTH}
          y2={height - PAD}
          strokeWidth="1"
          className="stroke-border"
        />
      ))}
      <line
        x1={gridX + columns.length * COL_WIDTH}
        y1={PAD + 4}
        x2={gridX + columns.length * COL_WIDTH}
        y2={height - PAD}
        strokeWidth="1"
        className="stroke-border"
      />
      <line
        x1={PAD}
        y1={PAD + headerHeight}
        x2={width - PAD}
        y2={PAD + headerHeight}
        strokeWidth="1"
        className="stroke-border"
      />

      {headerLines.map((lines, i) => (
        <TextBlock
          key={`h${i}`}
          lines={lines}
          x={gridX + i * COL_WIDTH + COL_WIDTH / 2}
          y={PAD + HEADER_PAD + 8}
          lineHeight={HEADER_LINE}
          fontSize={11}
          fontWeight={500}
          className="fill-muted-foreground"
        />
      ))}

      {body.map((row, i) => {
        const y = rowY[i];
        const centerY = y + row.height / 2;

        return (
          <motion.g
            key={i}
            {...colorProps(row.color)}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.3,
              delay: i * stagger,
              pulse: row.pulse
            })}
          >
            {i > 0 && (
              <line
                x1={PAD}
                y1={y}
                x2={width - PAD}
                y2={y}
                strokeWidth="1"
                className="stroke-border"
              />
            )}
            <TextBlock
              lines={row.labelLines}
              x={PAD + 4}
              y={centerY - ((row.labelLines.length - 1) * ROW_LINE) / 2 + 4}
              lineHeight={ROW_LINE}
              fontSize={12.5}
              anchor="start"
              className="fill-foreground"
            />
            {columns.map((_, ci) => {
              const cell = row.cells[ci];
              const cx = gridX + ci * COL_WIDTH + COL_WIDTH / 2;
              if (typeof cell === 'string') {
                return (
                  <TextBlock
                    key={ci}
                    lines={row.cellLines[ci]}
                    x={cx}
                    y={
                      centerY -
                      ((row.cellLines[ci].length - 1) * ROW_LINE) / 2 +
                      4
                    }
                    lineHeight={ROW_LINE}
                    fontSize={11.5}
                    style={{ fill: 'var(--mn-color)' }}
                  />
                );
              }
              if (cell === true) {
                return (
                  <path
                    key={ci}
                    d={`M ${cx - 5} ${centerY} l 3.5 4 l 6.5 -8`}
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ stroke: 'var(--mn-color)' }}
                  />
                );
              }
              if (cell === false) {
                return (
                  <path
                    key={ci}
                    d={`M ${cx - 4} ${centerY - 4} l 8 8 M ${cx + 4} ${centerY - 4} l -8 8`}
                    fill="none"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    className="stroke-muted-foreground"
                  />
                );
              }
              return (
                <line
                  key={ci}
                  x1={cx - 5}
                  y1={centerY}
                  x2={cx + 5}
                  y2={centerY}
                  strokeWidth="1.5"
                  className="stroke-border"
                />
              );
            })}
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
