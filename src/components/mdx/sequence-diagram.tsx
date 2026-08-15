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

interface SequenceActor {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** Technical detail under the actor name — host, port, role. */
  sublabel?: string;
  color?: DiagramColor;
}

interface SequenceMessage {
  /** Actor label (or 0-based index as a string) the arrow leaves from. */
  from: string | number;
  /** Actor label (or index). Same as `from` renders a self-call loop. */
  to: string | number;
  label?: string;
  /** Dashed stroke — use for responses, async, and anything passive. */
  dashed?: boolean;
  /** Aside printed under the message, in the muted color. */
  note?: string;
  color?: DiagramColor;
}

interface SequenceDiagramProps {
  /** Columns, left to right. Keep to 5 or fewer or the labels shrink. */
  actors: SequenceActor[];
  /** Rows, top to bottom, in time order. */
  messages: SequenceMessage[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Number each message in the left gutter, so prose can say "step 3". */
  numbered?: boolean;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const COL_WIDTH = 150;
const GUTTER = 30;
const PAD = 12;
const HEADER_TOP = 8;
const ACTOR_LINE = 15;
const ACTOR_PAD = 12;
const LIFELINE_TOP_GAP = 14;
const STEP = 40;
const LABEL_LINE = 13;
const NOTE_EXTRA = 15;
const SELF_EXTRA = 22;
const SELF_WIDTH = 46;
const STAGGER = 0.28;

function resolveActor(ref: string | number, actors: SequenceActor[]): number {
  if (typeof ref === 'number') return ref;
  const byLabel = actors.findIndex((a) => a.label === ref);
  if (byLabel >= 0) return byLabel;
  const asIndex = Number(ref);
  return Number.isInteger(asIndex) ? asIndex : 0;
}

export function SequenceDiagram({
  actors,
  messages,
  ariaLabel,
  title,
  caption,
  numbered = true,
  animate,
  align,
  className
}: SequenceDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const gutter = numbered ? GUTTER : 0;
  const width = gutter + actors.length * COL_WIDTH + PAD * 2;
  const boxWidth = COL_WIDTH - 20;

  // Actor boxes share one height so the lifelines all start level.
  const heads = actors.map((a) => ({
    ...a,
    lines: wrapText(a.label, boxWidth - 16, 13),
    subLines: a.sublabel ? wrapText(a.sublabel, boxWidth - 12, 10.5) : []
  }));
  const actorHeight =
    ACTOR_PAD * 2 +
    Math.max(
      ...heads.map((h) => h.lines.length * ACTOR_LINE + h.subLines.length * 13)
    );
  const lifelineTop = HEADER_TOP + actorHeight + LIFELINE_TOP_GAP;

  const columnX = (i: number) => PAD + gutter + i * COL_WIDTH + COL_WIDTH / 2;

  const resolved = messages.map((m) => {
    const fromIndex = resolveActor(m.from, actors);
    const toIndex = resolveActor(m.to, actors);
    const isSelf = fromIndex === toIndex;
    const x1 = columnX(fromIndex);
    const x2 = columnX(toIndex);
    // A self-call loops away from the nearest canvas edge, so its label has
    // room instead of running off the right side on the last actor.
    const selfDir = fromIndex === actors.length - 1 ? -1 : 1;
    const labelX = isSelf ? x1 + selfDir * (SELF_WIDTH + 8) : (x1 + x2) / 2;
    const labelWidth = isSelf
      ? selfDir > 0
        ? width - labelX - PAD
        : labelX - PAD
      : Math.max(Math.abs(x2 - x1) - 16, COL_WIDTH - 16);
    return {
      ...m,
      fromIndex,
      toIndex,
      isSelf,
      x1,
      x2,
      selfDir,
      labelX,
      lines: m.label ? wrapText(m.label, labelWidth, 11.5) : [],
      noteLines: m.note ? wrapText(m.note, labelWidth, 10.5) : []
    };
  });

  // Each row is one message; the label sits above the arrow, so a wrapped
  // label pushes the whole row down rather than colliding with the one above.
  const rowHeights = resolved.map(
    (m) =>
      STEP +
      Math.max(0, m.lines.length - 1) * LABEL_LINE +
      (m.isSelf ? SELF_EXTRA : 0) +
      m.noteLines.length * NOTE_EXTRA
  );
  const rowY: number[] = [];
  let cursor = lifelineTop + 18;
  rowHeights.forEach((h, i) => {
    rowY[i] = cursor + Math.max(0, resolved[i].lines.length - 1) * LABEL_LINE;
    cursor += h;
  });
  const lifelineBottom = cursor;
  const height = lifelineBottom + 16;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {resolved.map((m, i) => (
          <marker
            key={i}
            id={`seq-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <g {...colorProps(cycleColor(m.fromIndex, m.color))}>
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                style={{ fill: 'var(--mn-color)' }}
              />
            </g>
          </marker>
        ))}
      </defs>

      {heads.map((actor, i) => {
        const cx = columnX(i);
        const color = cycleColor(i, actor.color);
        const textTop =
          HEADER_TOP +
          (actorHeight -
            (actor.lines.length * ACTOR_LINE + actor.subLines.length * 13)) /
            2 +
          ACTOR_LINE -
          3;

        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({
              from: { opacity: 0, y: 4 },
              duration: 0.4,
              delay: i * 0.08,
              pulse: actor.pulse
            })}
          >
            <rect
              x={cx - boxWidth / 2}
              y={HEADER_TOP}
              width={boxWidth}
              height={actorHeight}
              rx="6"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={actor.lines}
              x={cx}
              y={textTop}
              lineHeight={ACTOR_LINE}
              fontSize={13}
              fontWeight={500}
              className="fill-foreground"
            />
            {actor.subLines.length > 0 && (
              <TextBlock
                lines={actor.subLines}
                x={cx}
                y={textTop + (actor.lines.length - 1) * ACTOR_LINE + 14}
                lineHeight={13}
                fontSize={10.5}
                className="fill-muted-foreground"
              />
            )}
            <line
              x1={cx}
              y1={HEADER_TOP + actorHeight}
              x2={cx}
              y2={lifelineBottom}
              strokeWidth="1"
              strokeDasharray="4 4"
              className="stroke-border"
            />
          </motion.g>
        );
      })}

      {resolved.map((m, i) => {
        const y = rowY[i];
        const delay = 0.2 + i * stagger;
        const color = cycleColor(m.fromIndex, m.color);
        const dir = m.x2 >= m.x1 ? 1 : -1;
        // Stop short of the lifeline so the arrowhead doesn't sit on it.
        const path = m.isSelf
          ? `M ${m.x1} ${y} H ${m.x1 + m.selfDir * SELF_WIDTH} V ${y + SELF_EXTRA} H ${m.x1 + m.selfDir * 4}`
          : `M ${m.x1 + dir * 2} ${y} H ${m.x2 - dir * 4}`;
        const labelAnchor = m.isSelf
          ? m.selfDir > 0
            ? 'start'
            : 'end'
          : 'middle';

        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({ from: { opacity: 0 }, duration: 0.35, delay })}
          >
            {numbered && (
              <text
                x={PAD + gutter - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {i + 1}
              </text>
            )}
            <motion.path
              d={path}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray={m.dashed ? '5 4' : undefined}
              style={{ stroke: 'var(--mn-color)' }}
              markerEnd={`url(#seq-arrow-${i})`}
              {...reveal({ from: { pathLength: 0 }, duration: 0.3, delay })}
            />
            {m.lines.length > 0 && (
              <TextBlock
                lines={m.lines}
                x={m.labelX}
                y={y - 8 - (m.lines.length - 1) * LABEL_LINE}
                lineHeight={LABEL_LINE}
                fontSize={11.5}
                anchor={labelAnchor}
                className="fill-foreground"
              />
            )}
            {m.noteLines.length > 0 && (
              <TextBlock
                lines={m.noteLines}
                x={m.labelX}
                y={y + (m.isSelf ? SELF_EXTRA : 0) + 15}
                lineHeight={13}
                fontSize={10.5}
                anchor={labelAnchor}
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
