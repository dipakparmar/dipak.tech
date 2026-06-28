'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import type { FlowColor } from './flow-diagram';
import { richText } from './rich-text';

interface LaneNode {
  label: string;
  sublabel?: string;
  color?: FlowColor;
  /** Small note rendered under this box — used for the cost/scope callout at the end of a lane. */
  caption?: string;
}

/** One connector line between two nodes. `align` positions it within the lane instead of dead-center. */
interface LaneConnectorLine {
  label?: string;
  align?: 'left' | 'center' | 'right';
  color?: FlowColor;
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
  className?: string;
}

const DEFAULT_CYCLE: FlowColor[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
const STAGGER = 0.4;
const NODE_HEIGHT = 56;
const GAP = 36;
const STEP = NODE_HEIGHT + GAP;
const LANE_WIDTH = 340;
const LANE_GAP = 24;
const LANE_PADDING = 16;
const HEADER_HEIGHT = 56;
// Left/right connector labels sit at centerX ± LINE_OFFSET. Kept proportional
// to LANE_WIDTH (~0.11) so widening the lane doesn't pull them back to center.
const LINE_OFFSET = Math.round(LANE_WIDTH * 0.11);
const BOTTOM_PADDING = 16;

function normalizeConnector(connector: LaneConnector | undefined): LaneConnectorLine[] {
  if (!connector) return [{ align: 'center' }];
  const lines = Array.isArray(connector) ? connector : [connector];
  if (lines.length === 2 && !lines[0].align && !lines[1].align) {
    return [{ ...lines[0], align: 'left' }, { ...lines[1], align: 'right' }];
  }
  return lines.map((line) => ({ align: 'center', ...line }));
}

function lineX(centerX: number, align: LaneConnectorLine['align']) {
  return align === 'left' ? centerX - LINE_OFFSET : align === 'right' ? centerX + LINE_OFFSET : centerX;
}

export function LaneDiagram({ lanes, ariaLabel, className }: LaneDiagramProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const reduceMotion = useReducedMotion();
  const played = Boolean(reduceMotion) || isInView;

  const laneCount = lanes.length;
  const width = laneCount * LANE_WIDTH + (laneCount - 1) * LANE_GAP + LANE_PADDING * 2;
  const maxNodes = Math.max(...lanes.map((l) => l.nodes.length));
  const captionRows = lanes.some((l) => l.nodes.some((n) => n.caption)) ? 18 : 0;
  const height = HEADER_HEIGHT + maxNodes * STEP - GAP + captionRows + BOTTOM_PADDING + LANE_PADDING * 2;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      className={`flow-diagram w-full mx-auto my-6 ${className ?? ''}`}
      style={{ maxWidth: width }}
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
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={played ? { opacity: 1 } : undefined}
              transition={{ duration: 0.4, ease: 'easeOut', delay: laneDelay }}
            >
              <text x={centerX} y={LANE_PADDING + 24} textAnchor="middle" fontSize="16" fontWeight="500" className="fill-foreground">
                {richText(lane.title, centerX, 18)}
              </text>
              {lane.subtitle && (
                <text x={centerX} y={LANE_PADDING + 40} textAnchor="middle" fontSize="12" className="fill-muted-foreground">
                  {richText(lane.subtitle, centerX)}
                </text>
              )}
            </motion.g>

            {lane.nodes.map((node, i) => {
              const y = LANE_PADDING + HEADER_HEIGHT + i * STEP;
              const color = node.color ?? DEFAULT_CYCLE[i % DEFAULT_CYCLE.length];
              const delay = laneDelay + i * STAGGER;
              const boxWidth = LANE_WIDTH - 28;
              const boxX = laneX + 14;
              const lines = i < lane.nodes.length - 1 ? normalizeConnector(lane.connectors?.[i]) : [];

              return (
                <g key={i}>
                  <motion.g
                    data-color={color}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={played ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.4, ease: 'easeOut', delay }}
                  >
                    <rect x={boxX} y={y} width={boxWidth} height={NODE_HEIGHT} rx="8" strokeWidth="1.5" style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }} />
                    <text x={centerX} y={y + (node.sublabel ? 23 : 32)} textAnchor="middle" fontSize="14" fontWeight="500" className="fill-foreground">
                      {richText(node.label, centerX)}
                    </text>
                    {node.sublabel && (
                      <text x={centerX} y={y + 40} textAnchor="middle" fontSize="11.5" className="fill-muted-foreground">
                        {richText(node.sublabel, centerX)}
                      </text>
                    )}
                  </motion.g>

                  {lines.map((line, li) => {
                    const align = line.align ?? 'center';
                    const x = lineX(centerX, align);
                    const y1 = y + NODE_HEIGHT;
                    const y2 = y + STEP;
                    const lineMid = y + NODE_HEIGHT + GAP / 2;
                    // Centered label sits on the line (baseline nudged up so the split gap
                    // brackets it); left/right labels sit beside the line, vertically centered.
                    const labelY = align === 'center' ? lineMid - 6 : lineMid + 4;
                    const lineStyle = line.color ? { stroke: 'var(--mn-color)' } : undefined;
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
                    const labelX = align === 'left' ? x - labelGap : align === 'right' ? x + labelGap : x;
                    const labelAnchor = align === 'left' ? 'end' : align === 'right' ? 'start' : 'middle';

                    return (
                      <g key={li} data-color={line.color}>
                        {splitLine ? (
                          <>
                            <motion.path
                              d={`M ${x} ${y1} L ${x} ${labelY - labelGapAbove}`}
                              fill="none"
                              strokeWidth="1.5"
                              style={lineStyle}
                              className={lineClass}
                              initial={reduceMotion ? false : { pathLength: 0 }}
                              animate={played ? { pathLength: 1 } : undefined}
                              transition={{ duration: 0.2, ease: 'easeOut', delay: delay + 0.2 }}
                            />
                            <motion.path
                              d={`M ${x} ${labelY + labelGapBelow} L ${x} ${y2}`}
                              fill="none"
                              strokeWidth="1.5"
                              style={lineStyle}
                              className={lineClass}
                              initial={reduceMotion ? false : { pathLength: 0 }}
                              animate={played ? { pathLength: 1 } : undefined}
                              transition={{ duration: 0.2, ease: 'easeOut', delay: delay + 0.3 }}
                            />
                          </>
                        ) : (
                          <motion.path
                            d={`M ${x} ${y1} L ${x} ${y2}`}
                            fill="none"
                            strokeWidth="1.5"
                            style={lineStyle}
                            className={lineClass}
                            initial={reduceMotion ? false : { pathLength: 0 }}
                            animate={played ? { pathLength: 1 } : undefined}
                            transition={{ duration: 0.3, ease: 'easeOut', delay: delay + 0.2 }}
                          />
                        )}
                        {line.label && (
                          <motion.g
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={played ? { opacity: 1 } : undefined}
                            transition={{ duration: 0.3, ease: 'easeOut', delay: delay + 0.3 }}
                          >
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor={labelAnchor}
                              fontSize="11"
                              className={line.color ? undefined : 'fill-muted-foreground'}
                              style={line.color ? { fill: 'var(--mn-color)' } : undefined}
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
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={played ? { opacity: 1 } : undefined}
                      transition={{ duration: 0.4, ease: 'easeOut', delay: delay + 0.2 }}
                    >
                      <text x={centerX} y={y + NODE_HEIGHT + 16} textAnchor="middle" fontSize="11" className="fill-muted-foreground">
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
