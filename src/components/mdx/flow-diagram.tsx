'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  DEFAULT_CYCLE,
  DiagramFigure,
  svgLayout,
  TextBlock,
  useReveal,
  wrapText,
  type DiagramActionsOption,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion,
  type FlowColor
} from './diagram-kit';
import { richInline, richText } from './rich-text';

export type { FlowColor };

type ArrowText = string | [string, string];
type NoteText = string | [string, string];
type FlowNode =
  | string
  | {
      label: string;
      sublabel?: string;
      color?: DiagramColor;
      children?: string[];
      note?: NoteText;
      /** Breathe on a loop once revealed, to mark the element worth looking at. */
      pulse?: boolean;
      connectChildren?: boolean;
    };
type FlowArrow = ArrowText | { label: ArrowText; color?: DiagramColor };

interface FlowDiagramProps {
  /** Node labels, top to bottom. Pass a string for the default color cycle, or an object to pin a color or add a cluster of sub-boxes. */
  nodes: FlowNode[];
  /** One entry per gap between nodes (nodes.length - 1 entries). A [line1, line2] tuple wraps onto two lines. */
  arrows?: FlowArrow[];
  ariaLabel: string;
  /** Short heading drawn above the diagram. */
  title?: string;
  /** Footnote drawn below the diagram, for caveats or scope notes. */
  caption?: string;
  /** Pulse the last node forever once it's revealed, to signal a recurring cycle. */
  pulseLast?: boolean;
  /** Send a small dot traveling down each arrow on a loop, to signal the chain runs continuously. */
  flow?: boolean;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  /** Corner for the download / full-screen buttons, or `false` to hide them. */
  actions?: DiagramActionsOption;
  className?: string;
}

const STAGGER = 0.55;
const NODE_HEIGHT = 40;
const LINE_HEIGHT = 18;
const SUB_LINE = 15;
const BOX_PAD = 11;
const CLUSTER_PADDING = 10;
const CLUSTER_HEADER = 20;
const CLUSTER_HEADER_GAP = 8;
const CLUSTER_CHILD_HEIGHT = 42;
const CLUSTER_HEIGHT =
  CLUSTER_PADDING +
  CLUSTER_HEADER +
  CLUSTER_HEADER_GAP +
  CLUSTER_CHILD_HEIGHT +
  CLUSTER_PADDING;
const GAP = 70;
const WIDTH = 440;
const NODE_WIDTH = 360;
const CLUSTER_WIDTH = 420;
const NOTE_WIDTH = 200;
const TITLE_HEIGHT = 30;
// Tailwind max-w-md / max-w-2xl, as the natural width the SVG scales to.
const NATURAL_WIDTH = 448;
const NATURAL_WIDTH_WITH_NOTE = 672;

// A small dot travels down each arrow in sequence, on a loop, once the
// entrance animation finishes — reads as "this chain runs continuously."
const TRAVEL_DURATION = 0.6;
const NODE_PAUSE = 0.45;

function resolveNode(node: FlowNode, i: number) {
  if (typeof node === 'string')
    return {
      label: node,
      sublabel: undefined as string | undefined,
      color: DEFAULT_CYCLE[i % DEFAULT_CYCLE.length],
      children: undefined as string[] | undefined,
      note: undefined as string[] | undefined,
      pulse: false,
      connectChildren: true
    };
  return {
    label: node.label,
    sublabel: node.sublabel,
    color: node.color ?? DEFAULT_CYCLE[i % DEFAULT_CYCLE.length],
    children: node.children,
    note: node.note
      ? Array.isArray(node.note)
        ? node.note
        : [node.note]
      : undefined,
    pulse: node.pulse ?? false,
    connectChildren: node.connectChildren ?? true
  };
}

function resolveArrow(arrow: FlowArrow, i: number) {
  const fallbackColor = DEFAULT_CYCLE[(i + 1) % DEFAULT_CYCLE.length];
  if (typeof arrow === 'string')
    return { lines: [arrow], color: fallbackColor };
  if (Array.isArray(arrow)) return { lines: arrow, color: fallbackColor };
  return {
    lines: Array.isArray(arrow.label) ? arrow.label : [arrow.label],
    color: arrow.color ?? fallbackColor
  };
}

export function FlowDiagram({
  nodes,
  arrows,
  ariaLabel,
  title,
  caption,
  pulseLast = false,
  flow = true,
  animate,
  align,
  actions,
  className
}: FlowDiagramProps) {
  const { ref, played, reduceMotion, staggerOr, reveal } =
    useReveal<SVGSVGElement>(0.3, animate);
  const stagger = staggerOr(STAGGER);

  // Labels are wrapped up front and each box is sized around the result, so
  // a long label grows its box instead of spilling past the edges.
  const resolved = nodes.map((node, i) => {
    const n = resolveNode(node, i);
    const boxWidth = n.children?.length ? CLUSTER_WIDTH : NODE_WIDTH;
    return {
      ...n,
      lines: wrapText(n.label, boxWidth - 28, 15),
      subLines: n.sublabel ? wrapText(n.sublabel, boxWidth - 24, 12) : [],
      // The box column stays centered and the note hangs into the margin the
      // extra width opened up, so the room for it is half of NOTE_WIDTH minus
      // the leader line — not the full NOTE_WIDTH.
      noteLines: n.note?.flatMap((line) =>
        wrapText(
          line,
          WIDTH + NOTE_WIDTH / 2 - (WIDTH - boxWidth) / 2 - boxWidth - 28,
          11.5
        )
      )
    };
  });
  const nodeHeights = resolved.map((n) =>
    n.children?.length
      ? CLUSTER_HEIGHT + (n.lines.length - 1) * LINE_HEIGHT
      : Math.max(
          NODE_HEIGHT,
          BOX_PAD * 2 +
            n.lines.length * LINE_HEIGHT +
            n.subLines.length * SUB_LINE
        )
  );
  const top = 20 + (title ? TITLE_HEIGHT : 0);
  const nodeY: number[] = [];
  let cursor = top;
  nodeHeights.forEach((h, i) => {
    nodeY[i] = cursor;
    cursor += h + GAP;
  });
  const height = cursor - GAP + 20;
  const entranceDone = (nodes.length - 1) * stagger + 1;
  const loopPeriod = (arrows?.length ?? 0) * (TRAVEL_DURATION + NODE_PAUSE);
  const hasNote = resolved.some((n) => n.note);
  const svgWidth = WIDTH + (hasNote ? NOTE_WIDTH : 0);
  // Keep the box column centered in the wider canvas; the note hangs into the
  // right margin the extra width opened up.
  const shiftX = hasNote ? NOTE_WIDTH / 2 : 0;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${svgWidth} ${height}`}
      {...svgLayout(
        align,
        hasNote ? NATURAL_WIDTH_WITH_NOTE : NATURAL_WIDTH,
        className
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {arrows?.map((arrow, i) => {
          const { color } = resolveArrow(arrow, i);
          return (
            <marker
              key={i}
              id={`flow-arrow-${i}`}
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                {...colorProps(color, { fill: 'var(--mn-color)' })}
              />
            </marker>
          );
        })}
      </defs>

      <g transform={shiftX ? `translate(${shiftX} 0)` : undefined}>
        {title && (
          <motion.g {...reveal({ from: { opacity: 0 }, duration: 0.45 })}>
            <text
              x={WIDTH / 2}
              y="20"
              textAnchor="middle"
              fontSize="16"
              fontWeight="500"
              className="fill-foreground"
            >
              {richText(title, WIDTH / 2, 16)}
            </text>
          </motion.g>
        )}

        {resolved.map(
          (
            {
              lines,
              subLines,
              color,
              children,
              noteLines,
              pulse,
              connectChildren
            },
            i
          ) => {
            const delay = i * stagger;
            const isLast = pulseLast && i === nodes.length - 1;
            const y = nodeY[i];
            const boxHeight = nodeHeights[i];
            const boxWidth = children?.length ? CLUSTER_WIDTH : NODE_WIDTH;
            const boxX = (WIDTH - boxWidth) / 2;
            const boxRight = boxX + boxWidth;

            return (
              <motion.g
                key={i}
                {...colorProps(color)}
                {...reveal({
                  from: { opacity: 0, y: 4 },
                  duration: 0.45,
                  delay,
                  pulse
                })}
              >
                <rect
                  x={boxX}
                  y={y}
                  width={boxWidth}
                  height={boxHeight}
                  rx="6"
                  strokeWidth="1.5"
                  style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
                />
                <TextBlock
                  lines={lines}
                  x={WIDTH / 2}
                  y={
                    children?.length
                      ? y + CLUSTER_PADDING + 15
                      : y +
                        (boxHeight -
                          (lines.length * LINE_HEIGHT +
                            subLines.length * SUB_LINE)) /
                          2 +
                        LINE_HEIGHT -
                        4
                  }
                  lineHeight={LINE_HEIGHT}
                  fontSize={15}
                  fontWeight={500}
                  className="fill-foreground"
                />
                {subLines.length > 0 && !children?.length && (
                  <TextBlock
                    lines={subLines}
                    x={WIDTH / 2}
                    y={
                      y +
                      (boxHeight -
                        (lines.length * LINE_HEIGHT +
                          subLines.length * SUB_LINE)) /
                        2 +
                      lines.length * LINE_HEIGHT +
                      SUB_LINE -
                      5
                    }
                    lineHeight={SUB_LINE}
                    fontSize={12}
                    className="fill-muted-foreground"
                  />
                )}
                {children?.length && (
                  <ChildRow
                    x={boxX}
                    y={
                      y + CLUSTER_PADDING + CLUSTER_HEADER + CLUSTER_HEADER_GAP
                    }
                    width={boxWidth}
                    labels={children}
                    connect={connectChildren}
                  />
                )}
                {noteLines?.length ? (
                  <g>
                    <line
                      x1={boxRight}
                      y1={y + boxHeight / 2}
                      x2={boxRight + 18}
                      y2={y + boxHeight / 2}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      className="stroke-muted-foreground"
                    />
                    <TextBlock
                      lines={noteLines ?? []}
                      x={boxRight + 24}
                      y={
                        y +
                        boxHeight / 2 -
                        ((noteLines?.length ?? 1) - 1) * 6.5 +
                        4
                      }
                      lineHeight={13}
                      fontSize={11.5}
                      anchor="start"
                      className="fill-muted-foreground"
                    />
                  </g>
                ) : null}
                {isLast && (
                  <motion.rect
                    x={boxX - 5}
                    y={y - 5}
                    width={boxWidth + 10}
                    height={boxHeight + 10}
                    rx="10"
                    strokeWidth="0"
                    style={{
                      fill: 'var(--mn-color)',
                      transformOrigin: 'center',
                      filter: 'url(#flow-glow)'
                    }}
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={
                      played
                        ? { opacity: [0.5, 0, 0.5], scale: [1, 1.08, 1] }
                        : undefined
                    }
                    transition={{
                      duration: 1.8,
                      ease: 'easeInOut',
                      delay: delay + 0.5,
                      repeat: Infinity
                    }}
                  />
                )}
              </motion.g>
            );
          }
        )}

        {arrows?.map((arrow, i) => {
          const { lines: rawLines, color } = resolveArrow(arrow, i);
          // Each supplied line is a deliberate break; anything still too long
          // for the right margin wraps again rather than running off-canvas.
          const lines = rawLines.flatMap((line) =>
            wrapText(line, WIDTH / 2 - 30, 11.5)
          );
          const delay = i * stagger + 0.3;
          const y1 = nodeY[i] + nodeHeights[i];
          const y2 = nodeY[i + 1];
          const textX = WIDTH / 2 + 12;

          return (
            <motion.g
              key={i}
              {...colorProps(color)}
              {...reveal({ from: { opacity: 0 }, duration: 0.45, delay })}
            >
              <motion.path
                d={`M ${WIDTH / 2} ${y1} L ${WIDTH / 2} ${y2}`}
                fill="none"
                strokeWidth="1.5"
                style={{ stroke: 'var(--mn-color)' }}
                markerEnd={`url(#flow-arrow-${i})`}
                {...reveal({ from: { pathLength: 0 }, duration: 0.35, delay })}
              />
              {flow && !reduceMotion && played && (
                <motion.circle
                  cx={WIDTH / 2}
                  r="4"
                  style={{ fill: 'var(--mn-color)' }}
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
              <TextBlock
                lines={lines}
                x={textX}
                y={(y1 + y2) / 2 - (lines.length - 1) * 6.5 + 3}
                lineHeight={13}
                fontSize={11.5}
                anchor="start"
                className="fill-muted-foreground"
              />
            </motion.g>
          );
        })}
      </g>
    </svg>
  );

  // The heading is drawn inside the SVG here (it predates DiagramFigure's
  // HTML title), so only the caption is handed over.
  return (
    <DiagramFigure
      caption={caption}
      align={align}
      actions={actions}
      label={ariaLabel}
    >
      {svg}
    </DiagramFigure>
  );
}

function ChildRow({
  x,
  y,
  width,
  labels,
  connect = true
}: {
  x: number;
  y: number;
  width: number;
  labels: string[];
  connect?: boolean;
}) {
  const padding = 8;
  const gap = 6;
  const innerWidth = width - padding * 2;
  const childWidth = (innerWidth - gap * (labels.length - 1)) / labels.length;
  const lineHeight = 12;
  const midY = y + CLUSTER_CHILD_HEIGHT / 2;

  return (
    <>
      {connect &&
        labels.slice(1).map((_, i) => {
          const lineX1 = x + padding + (i + 1) * (childWidth + gap) - gap;
          return (
            <line
              key={`c${i}`}
              x1={lineX1}
              y1={midY}
              x2={lineX1 + gap}
              y2={midY}
              strokeWidth="1"
              style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.4 }}
            />
          );
        })}
      {labels.map((label, i) => {
        const cx = x + padding + i * (childWidth + gap);
        const lines = wrapText(label, childWidth - 10, 11);
        const startY =
          y +
          CLUSTER_CHILD_HEIGHT / 2 +
          3.5 -
          ((lines.length - 1) * lineHeight) / 2;
        return (
          <g key={i}>
            <rect
              x={cx}
              y={y}
              width={childWidth}
              height={CLUSTER_CHILD_HEIGHT}
              rx="5"
              strokeWidth="1"
              style={{
                fill: 'var(--mn-color)',
                fillOpacity: 0.12,
                stroke: 'var(--mn-color)',
                strokeOpacity: 0.4
              }}
            />
            <text
              x={cx + childWidth / 2}
              y={startY}
              textAnchor="middle"
              fontSize="11"
              className="fill-foreground"
            >
              {lines.map((ln, li) => (
                <tspan
                  key={li}
                  x={cx + childWidth / 2}
                  dy={li === 0 ? 0 : lineHeight}
                >
                  {richInline(ln)}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </>
  );
}
