'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  cycleColor,
  DiagramFigure,
  elbowPath,
  measureText,
  elbowVertical,
  svgLayout,
  TextBlock,
  useReveal,
  wrapText,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';

interface ArchNode {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  /** Referenced by `links` and by a zone's `nodes`. */
  id: string;
  label: string;
  /** Technical detail — port, protocol, image, region. */
  sublabel?: string;
  /** Short uppercase tag in the box corner, e.g. "API", "QUEUE". */
  tag?: string;
  color?: DiagramColor;
  /** 0-based grid position. Columns run left to right, rows top to bottom. */
  col: number;
  row: number;
  /** Columns to span. Defaults to 1. */
  span?: number;
}

interface ArchZone {
  label: string;
  /** Ids of the nodes the zone encloses. */
  nodes: string[];
  color?: DiagramColor;
}

interface ArchLink {
  from: string;
  to: string;
  label?: string;
  /** Dashed — async, optional, or a return path. */
  dashed?: boolean;
  color?: DiagramColor;
}

interface ArchitectureDiagramProps {
  /** Nodes on an explicit grid. You place them; nothing is auto-arranged, so
   *  the layout is exactly what you asked for. */
  nodes: ArchNode[];
  links?: ArchLink[];
  /** Dashed boundaries drawn behind the nodes — a VPC, a trust boundary. */
  zones?: ArchZone[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const PAD = 16;
const COL_WIDTH = 150;
const COL_GAP = 34;
const COL_STEP = COL_WIDTH + COL_GAP;
const MIN_HEIGHT = 56;
const ROW_GAP = 52;
const BOX_PAD = 10;
const LINE_HEIGHT = 16;
const SUB_LINE = 13;
const ZONE_PAD = 12;
const ZONE_HEADER = 14;
const STAGGER = 0.07;

export function ArchitectureDiagram({
  nodes,
  links = [],
  zones = [],
  ariaLabel,
  title,
  caption,
  animate,
  align,
  className
}: ArchitectureDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.15, animate);
  const stagger = staggerOr(STAGGER);

  const colCount = Math.max(...nodes.map((n) => n.col + (n.span ?? 1)));
  const rowCount = Math.max(...nodes.map((n) => n.row)) + 1;

  const boxes = nodes.map((node, i) => {
    const boxWidth = (node.span ?? 1) * COL_STEP - COL_GAP;
    const lines = wrapText(node.label, boxWidth - 24, 14);
    const subLines = node.sublabel
      ? wrapText(node.sublabel, boxWidth - 20, 11)
      : [];
    return {
      ...node,
      boxWidth,
      lines,
      subLines,
      color: cycleColor(i, node.color),
      height: Math.max(
        MIN_HEIGHT,
        BOX_PAD * 2 +
          (node.tag ? 10 : 0) +
          lines.length * LINE_HEIGHT +
          subLines.length * SUB_LINE
      )
    };
  });

  const rowHeights = Array.from({ length: rowCount }, (_, r) =>
    Math.max(
      MIN_HEIGHT,
      ...boxes.filter((b) => b.row === r).map((b) => b.height)
    )
  );
  const hasZones = zones.length > 0;
  const rowY: number[] = [];
  let cursor = PAD + (hasZones ? ZONE_PAD + ZONE_HEADER : 0);
  rowHeights.forEach((h, i) => {
    rowY[i] = cursor;
    cursor += h + ROW_GAP;
  });
  const width =
    PAD * 2 +
    colCount * COL_WIDTH +
    (colCount - 1) * COL_GAP +
    (hasZones ? ZONE_PAD * 2 : 0);
  const height = cursor - ROW_GAP + PAD + (hasZones ? ZONE_PAD : 0);

  const originX = PAD + (hasZones ? ZONE_PAD : 0);
  const boxX = (b: (typeof boxes)[number]) => originX + b.col * COL_STEP;
  const boxY = (b: (typeof boxes)[number]) =>
    rowY[b.row] + (rowHeights[b.row] - b.height) / 2;
  const byId = new Map(boxes.map((b) => [b.id, b]));

  // Connector geometry is computed once: the paths are drawn under the boxes
  // so lines tuck behind them, and the labels in a later pass on top, so a
  // label that lands near a box is still readable.
  const routes = links.map((link) => {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!a || !b) return null;
    const ax = boxX(a);
    const bx = boxX(b);
    const ay = boxY(a);
    const by = boxY(b);
    const sameRow = a.row === b.row;
    // Leave from the edge that faces the target, so the connector never
    // starts inside its own box.
    const start = sameRow
      ? { x: bx >= ax ? ax + a.boxWidth : ax, y: ay + a.height / 2 }
      : { x: ax + a.boxWidth / 2, y: by > ay ? ay + a.height : ay };
    const end = sameRow
      ? { x: bx >= ax ? bx : bx + b.boxWidth, y: by + b.height / 2 }
      : { x: bx + b.boxWidth / 2, y: by > ay ? by : by + b.height };
    const labelLines = link.label
      ? wrapText(link.label, sameRow ? COL_GAP + 40 : COL_WIDTH, 10.5)
      : [];
    return {
      link,
      color: link.color ?? a.color,
      d: sameRow
        ? elbowPath(start.x, start.y, end.x, end.y, 8)
        : elbowVertical(start.x, start.y, end.x, end.y, 8),
      labelLines,
      labelX: (start.x + end.x) / 2,
      labelY: (start.y + end.y) / 2,
      labelWidth: Math.max(...labelLines.map((l) => measureText(l, 10.5)), 10)
    };
  });

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {links.map((link, i) => (
          <marker
            key={i}
            id={`arch-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <g {...colorProps(link.color ?? byId.get(link.from)?.color)}>
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                style={{ fill: 'var(--mn-color)' }}
              />
            </g>
          </marker>
        ))}
      </defs>

      {zones.map((zone, i) => {
        const members = zone.nodes
          .map((id) => byId.get(id))
          .filter((b): b is (typeof boxes)[number] => Boolean(b));
        if (!members.length) return null;
        const x1 = Math.min(...members.map(boxX)) - ZONE_PAD;
        const x2 =
          Math.max(...members.map((b) => boxX(b) + b.boxWidth)) + ZONE_PAD;
        const y1 = Math.min(...members.map(boxY)) - ZONE_PAD - ZONE_HEADER;
        const y2 =
          Math.max(...members.map((b) => boxY(b) + b.height)) + ZONE_PAD;

        return (
          <motion.g
            key={`zone-${i}`}
            {...colorProps(zone.color ?? 'neutral')}
            {...reveal({ from: { opacity: 0 }, duration: 0.4 })}
          >
            <rect
              x={x1}
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              rx="10"
              fill="none"
              strokeWidth="1"
              strokeDasharray="5 4"
              style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.7 }}
            />
            <text
              x={x1 + 10}
              y={y1 + 13}
              fontSize="9.5"
              letterSpacing="0.1em"
              style={{ fill: 'var(--mn-color)' }}
            >
              {zone.label.toUpperCase()}
            </text>
          </motion.g>
        );
      })}

      {routes.map((route, i) =>
        route ? (
          <motion.g
            key={`link-${i}`}
            {...colorProps(route.color)}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.25 + i * 0.05
            })}
          >
            <path
              d={route.d}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray={route.link.dashed ? '5 4' : undefined}
              style={{ stroke: 'var(--mn-color)' }}
              markerEnd={`url(#arch-arrow-${i})`}
            />
          </motion.g>
        ) : null
      )}

      {boxes.map((node, i) => {
        const x = boxX(node);
        const y = boxY(node);
        const cx = x + node.boxWidth / 2;
        const tagRoom = node.tag ? 10 : 0;
        const textTop =
          y +
          tagRoom +
          (node.height -
            tagRoom -
            (node.lines.length * LINE_HEIGHT +
              node.subLines.length * SUB_LINE)) /
            2 +
          LINE_HEIGHT -
          4;

        return (
          <motion.g
            key={i}
            {...colorProps(node.color)}
            {...reveal({
              from: { opacity: 0, y: 4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: node.pulse
            })}
          >
            <rect
              x={x}
              y={y}
              width={node.boxWidth}
              height={node.height}
              rx="6"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            {node.tag && (
              <text
                x={x + 10}
                y={y + 15}
                fontSize="8.5"
                letterSpacing="0.1em"
                style={{ fill: 'var(--mn-color)' }}
              >
                {node.tag.toUpperCase()}
              </text>
            )}
            <TextBlock
              lines={node.lines}
              x={cx}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={14}
              fontWeight={500}
              className="fill-foreground"
            />
            {node.subLines.length > 0 && (
              <TextBlock
                lines={node.subLines}
                x={cx}
                y={textTop + (node.lines.length - 1) * LINE_HEIGHT + 14}
                lineHeight={SUB_LINE}
                fontSize={11}
                className="fill-muted-foreground"
              />
            )}
          </motion.g>
        );
      })}

      {routes.map((route, i) =>
        route && route.labelLines.length > 0 ? (
          <motion.g
            key={`link-label-${i}`}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.35 + i * 0.05
            })}
          >
            {/* Opaque plate keeps the connector and any box edge underneath
                from running through the label. */}
            <rect
              x={route.labelX - route.labelWidth / 2 - 4}
              y={route.labelY - route.labelLines.length * 6 - 4}
              width={route.labelWidth + 8}
              height={route.labelLines.length * 12 + 6}
              rx="3"
              style={{ fill: 'var(--color-background)' }}
            />
            <TextBlock
              lines={route.labelLines}
              x={route.labelX}
              y={route.labelY - (route.labelLines.length - 1) * 6 + 3}
              lineHeight={12}
              fontSize={10.5}
              className="fill-muted-foreground"
            />
          </motion.g>
        ) : null
      )}
    </svg>
  );

  return (
    <DiagramFigure title={title} caption={caption} align={align}>
      {svg}
    </DiagramFigure>
  );
}
