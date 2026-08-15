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

interface TimelineEvent {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  /** Left-gutter marker — a date, version, or duration. Keep it short. */
  when: string;
  label: string;
  /** Detail line under the label. */
  sublabel?: string;
  color?: DiagramColor;
  /** Draw a hollow ring instead of a filled dot — for planned/future events. */
  pending?: boolean;
}

interface TimelineDiagramProps {
  events: TimelineEvent[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const WIDTH = 520;
const PAD = 10;
const WHEN_WIDTH = 96;
const SPINE_X = PAD + WHEN_WIDTH + 16;
const LABEL_X = SPINE_X + 20;
const LABEL_WIDTH = WIDTH - LABEL_X - PAD;
const ROW_GAP = 26;
const LINE_HEIGHT = 16;
const WHEN_LINE = 13;
const SUB_LINE = 13;
const STAGGER = 0.14;

export function TimelineDiagram({
  events,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  className
}: TimelineDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.15, animate);
  const stagger = staggerOr(STAGGER);

  const rows = events.map((e) => ({
    ...e,
    whenLines: wrapText(e.when, WHEN_WIDTH, 11.5),
    lines: wrapText(e.label, LABEL_WIDTH, 14),
    subLines: e.sublabel ? wrapText(e.sublabel, LABEL_WIDTH, 11.5) : []
  }));
  const rowHeights = rows.map(
    (r) =>
      Math.max(
        r.lines.length * LINE_HEIGHT + r.subLines.length * SUB_LINE,
        r.whenLines.length * WHEN_LINE
      ) + ROW_GAP
  );
  const rowY: number[] = [];
  let cursor = PAD + 12;
  rowHeights.forEach((h, i) => {
    rowY[i] = cursor;
    cursor += h;
  });
  const height = cursor - ROW_GAP + PAD + 8;
  const spineTop = rowY[0] ?? PAD;
  const spineBottom = rowY[rows.length - 1] ?? height;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <motion.line
        x1={SPINE_X}
        y1={spineTop - 4}
        x2={SPINE_X}
        y2={spineBottom - 4}
        strokeWidth="1.5"
        className="stroke-border"
        {...reveal({ from: { pathLength: 0 }, duration: 0.6 })}
      />

      {rows.map((event, i) => {
        const y = rowY[i];
        const color = cycleColor(i, event.color);

        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({
              from: { opacity: 0, x: -4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: event.pulse
            })}
          >
            <circle
              cx={SPINE_X}
              cy={y - 4}
              r={event.pending ? 4.5 : 5}
              strokeWidth="2"
              style={{
                fill: event.pending
                  ? 'var(--color-background)'
                  : 'var(--mn-color)',
                stroke: 'var(--mn-color)'
              }}
            />
            <TextBlock
              lines={event.whenLines}
              x={PAD + WHEN_WIDTH}
              y={y}
              lineHeight={WHEN_LINE}
              fontSize={11.5}
              fontWeight={500}
              anchor="end"
              style={{ fill: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={event.lines}
              x={LABEL_X}
              y={y}
              lineHeight={LINE_HEIGHT}
              fontSize={14}
              fontWeight={500}
              anchor="start"
              className="fill-foreground"
            />
            {event.subLines.length > 0 && (
              <TextBlock
                lines={event.subLines}
                x={LABEL_X}
                y={y + (event.lines.length - 1) * LINE_HEIGHT + 16}
                lineHeight={SUB_LINE}
                fontSize={11.5}
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
    <DiagramFigure title={title} caption={caption} align={align}>
      {svg}
    </DiagramFigure>
  );
}
