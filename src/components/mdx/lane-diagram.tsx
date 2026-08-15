'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  DEFAULT_CYCLE,
  svgLayout,
  useReveal,
  TextBlock,
  wrapText,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';
import { richText } from './rich-text';

interface LaneNode {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  sublabel?: string;
  color?: DiagramColor;
  /** Small note rendered under this box — used for the cost/scope callout at the end of a lane. */
  caption?: string;
}

/** One connector line between two nodes. `align` positions it within the lane instead of dead-center. */
interface LaneConnectorLine {
  label?: string;
  align?: 'left' | 'center' | 'right';
  color?: DiagramColor;
}

/** One line, or several parallel lines (e.g. a separate "NFC" line and "HAP" line side by side). */
type LaneConnector = LaneConnectorLine | LaneConnectorLine[];

interface Lane {
  title: string;
  subtitle?: string;
  nodes: LaneNode[];
  /** One entry per gap between nodes (nodes.length - 1 entries). Omit a gap to get the default single centered line. */
  connectors?: LaneConnector[];
}

// No hard cap on lanes.length, but each lane has a fixed internal width
// (LANE_WIDTH) inside a container capped at max-w-2xl — more lanes means
// the same rendered width split more ways, so text shrinks. Built for and
// best at 2 lanes; 3 is still readable; 4+ will likely wrap/overlap labels.
interface LaneDiagramProps {
  lanes: Lane[];
  ariaLabel: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const STAGGER = 0.4;
const MIN_NODE_HEIGHT = 56;
const LINE_HEIGHT = 19;
const SUB_LINE = 15;
const BOX_PAD = 10;
const GAP = 36;
const LANE_WIDTH = 300;
const LANE_GAP = 24;
const LANE_PADDING = 16;
const HEADER_HEIGHT = 56;
// Left/right connector labels sit at centerX ± LINE_OFFSET. Kept proportional
// to LANE_WIDTH (~0.11) so widening the lane doesn't pull them back to center.
const LINE_OFFSET = Math.round(LANE_WIDTH * 0.11);
const BOTTOM_PADDING = 16;

function normalizeConnector(
  connector: LaneConnector | undefined
): LaneConnectorLine[] {
  if (!connector) return [{ align: 'center' }];
  const lines = Array.isArray(connector) ? connector : [connector];
  if (lines.length === 2 && !lines[0].align && !lines[1].align) {
    return [
      { ...lines[0], align: 'left' },
      { ...lines[1], align: 'right' }
    ];
  }
  return lines.map((line) => ({ align: 'center', ...line }));
}

function lineX(centerX: number, align: LaneConnectorLine['align']) {
  return align === 'left'
    ? centerX - LINE_OFFSET
    : align === 'right'
      ? centerX + LINE_OFFSET
      : centerX;
}

export function LaneDiagram({
  lanes,
  ariaLabel,
  animate,
  align,
  className
}: LaneDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const laneCount = lanes.length;
  const width =
    laneCount * LANE_WIDTH + (laneCount - 1) * LANE_GAP + LANE_PADDING * 2;
  const maxNodes = Math.max(...lanes.map((l) => l.nodes.length));
  const captionRows = lanes.some((l) => l.nodes.some((n) => n.caption))
    ? 18
    : 0;
  const boxWidth = LANE_WIDTH - 28;

  // Labels are wrapped up front; a row is as tall as the tallest box in it,
  // across every lane, so the lanes stay in step no matter how the text falls.
  const wrapped = lanes.map((lane) =>
    lane.nodes.map((node) => {
      const lines = wrapText(node.label, boxWidth - 20, 16);
      const subLines = node.sublabel
        ? wrapText(node.sublabel, boxWidth - 16, 13)
        : [];
      return {
        node,
        lines,
        subLines,
        height:
          BOX_PAD * 2 + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE
      };
    })
  );
  const rowHeights = Array.from({ length: maxNodes }, (_, i) =>
    Math.max(MIN_NODE_HEIGHT, ...wrapped.map((l) => l[i]?.height ?? 0))
  );
  const rowY: number[] = [];
  let rowCursor = LANE_PADDING + HEADER_HEIGHT;
  rowHeights.forEach((h, i) => {
    rowY[i] = rowCursor;
    rowCursor += h + GAP;
  });
  const height = rowCursor - GAP + captionRows + BOTTOM_PADDING + LANE_PADDING;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {lanes.map((lane, laneIndex) => {
        const laneX = LANE_PADDING + laneIndex * (LANE_WIDTH + LANE_GAP);
        const centerX = laneX + LANE_WIDTH / 2;
        const laneDelay = laneIndex * 0.15;

        return (
          <g key={laneIndex}>
            <rect
              x={laneX}
              y={LANE_PADDING}
              width={LANE_WIDTH}
              height={height - LANE_PADDING * 2}
              rx="14"
              fill="none"
              strokeDasharray="4 3"
              className="stroke-border"
              strokeWidth="1"
            />
            <motion.g
              {...reveal({
                from: { opacity: 0 },
                duration: 0.4,
                delay: laneDelay
              })}
            >
              <text
                x={centerX}
                y={LANE_PADDING + 24}
                textAnchor="middle"
                fontSize="18"
                fontWeight="500"
                className="fill-foreground"
              >
                {richText(lane.title, centerX, 20)}
              </text>
              {lane.subtitle && (
                <text
                  x={centerX}
                  y={LANE_PADDING + 41}
                  textAnchor="middle"
                  fontSize="13"
                  className="fill-muted-foreground"
                >
                  {richText(lane.subtitle, centerX)}
                </text>
              )}
            </motion.g>

            {lane.nodes.map((node, i) => {
              const y = rowY[i];
              const nodeHeight = rowHeights[i];
              const { lines: labelLines, subLines } = wrapped[laneIndex][i];
              const color =
                node.color ?? DEFAULT_CYCLE[i % DEFAULT_CYCLE.length];
              const delay = laneDelay + i * stagger;
              const boxX = laneX + 14;
              const textTop =
                y +
                (nodeHeight -
                  (labelLines.length * LINE_HEIGHT +
                    subLines.length * SUB_LINE)) /
                  2 +
                LINE_HEIGHT -
                4;
              const lines =
                i < lane.nodes.length - 1
                  ? normalizeConnector(lane.connectors?.[i])
                  : [];

              return (
                <g key={i}>
                  <motion.g
                    {...colorProps(color)}
                    {...reveal({
                      from: { opacity: 0, y: 4 },
                      duration: 0.4,
                      delay,
                      pulse: node.pulse
                    })}
                  >
                    <rect
                      x={boxX}
                      y={y}
                      width={boxWidth}
                      height={nodeHeight}
                      rx="8"
                      strokeWidth="1.5"
                      style={{
                        fill: 'var(--ac-fill)',
                        stroke: 'var(--mn-color)'
                      }}
                    />
                    <TextBlock
                      lines={labelLines}
                      x={centerX}
                      y={textTop}
                      lineHeight={LINE_HEIGHT}
                      fontSize={16}
                      fontWeight={500}
                      className="fill-foreground"
                    />
                    {subLines.length > 0 && (
                      <TextBlock
                        lines={subLines}
                        x={centerX}
                        y={
                          textTop +
                          (labelLines.length - 1) * LINE_HEIGHT +
                          SUB_LINE
                        }
                        lineHeight={SUB_LINE}
                        fontSize={13}
                        className="fill-muted-foreground"
                      />
                    )}
                  </motion.g>

                  {lines.map((line, li) => {
                    const align = line.align ?? 'center';
                    const x = lineX(centerX, align);
                    const y1 = y + nodeHeight;
                    const y2 = rowY[i + 1];
                    const lineMid = (y1 + y2) / 2;
                    // Centered label sits on the line (baseline nudged up so the split gap
                    // brackets it); left/right labels sit beside the line, vertically centered.
                    const labelY =
                      align === 'center' ? lineMid - 6 : lineMid + 4;
                    const lineStyle = line.color
                      ? { stroke: 'var(--mn-color)' }
                      : undefined;
                    const lineClass = line.color ? undefined : 'stroke-border';
                    // A centered label sits right on the line's midpoint — split the line
                    // around it instead of drawing through the text. Gaps are asymmetric
                    // around the text baseline (not its visual center): the ascender eats
                    // most of the space above, the descender almost none below. A left/right
                    // label sits at the lane edge, clear of the line, so the line stays whole.
                    const labelGapAbove = 10;
                    const labelGapBelow = 5;
                    const splitLine = Boolean(line.label) && align === 'center';
                    const labelGap = 6;
                    const labelX =
                      align === 'left'
                        ? x - labelGap
                        : align === 'right'
                          ? x + labelGap
                          : x;
                    const labelAnchor =
                      align === 'left'
                        ? 'end'
                        : align === 'right'
                          ? 'start'
                          : 'middle';

                    return (
                      <g key={li} {...colorProps(line.color)}>
                        {splitLine ? (
                          <>
                            <motion.path
                              d={`M ${x} ${y1} L ${x} ${labelY - labelGapAbove}`}
                              fill="none"
                              strokeWidth="1.5"
                              style={lineStyle}
                              className={lineClass}
                              {...reveal({
                                from: { pathLength: 0 },
                                duration: 0.2,
                                delay: delay + 0.2
                              })}
                            />
                            <motion.path
                              d={`M ${x} ${labelY + labelGapBelow} L ${x} ${y2}`}
                              fill="none"
                              strokeWidth="1.5"
                              style={lineStyle}
                              className={lineClass}
                              {...reveal({
                                from: { pathLength: 0 },
                                duration: 0.2,
                                delay: delay + 0.3
                              })}
                            />
                          </>
                        ) : (
                          <motion.path
                            d={`M ${x} ${y1} L ${x} ${y2}`}
                            fill="none"
                            strokeWidth="1.5"
                            style={lineStyle}
                            className={lineClass}
                            {...reveal({
                              from: { pathLength: 0 },
                              duration: 0.3,
                              delay: delay + 0.2
                            })}
                          />
                        )}
                        {line.label && (
                          <motion.g
                            {...reveal({
                              from: { opacity: 0 },
                              duration: 0.3,
                              delay: delay + 0.3
                            })}
                          >
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor={labelAnchor}
                              fontSize="12"
                              className={
                                line.color ? undefined : 'fill-muted-foreground'
                              }
                              style={
                                line.color
                                  ? { fill: 'var(--mn-color)' }
                                  : undefined
                              }
                            >
                              {richText(line.label, labelX)}
                            </text>
                          </motion.g>
                        )}
                      </g>
                    );
                  })}

                  {node.caption && (
                    <motion.g
                      {...reveal({
                        from: { opacity: 0 },
                        duration: 0.4,
                        delay: delay + 0.2
                      })}
                    >
                      <text
                        x={centerX}
                        y={y + nodeHeight + 16}
                        textAnchor="middle"
                        fontSize="12"
                        className="fill-muted-foreground"
                      >
                        {richText(node.caption, centerX)}
                      </text>
                    </motion.g>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
