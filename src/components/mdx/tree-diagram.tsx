'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  cycleColor,
  DiagramFigure,
  elbowPath,
  svgLayout,
  TextBlock,
  useReveal,
  wrapText,
  type DiagramActionsOption,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';
import { richInline } from './rich-text';

export interface TreeNode {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** Detail line inside the box — a type, count, or owner. */
  sublabel?: string;
  color?: DiagramColor;
  /** Label printed on the connector coming into this node. */
  edgeLabel?: string;
  children?: TreeNode[];
}

interface TreeDiagramProps {
  /** Single root. Renders left to right, so deep trees stay readable. */
  root: TreeNode;
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

const PAD = 12;
const NODE_WIDTH = 152;
const COL_GAP = 56;
const COL_STEP = NODE_WIDTH + COL_GAP;
const MIN_ROW_HEIGHT = 46;
const ROW_GAP = 16;
const LINE_HEIGHT = 15;
const SUB_LINE = 13;
const BOX_PAD = 10;
const STAGGER = 0.1;

interface Placed {
  node: TreeNode;
  depth: number;
  /** Row index in leaf units — parents sit at the mean of their children. */
  row: number;
  color: DiagramColor;
  parent?: Placed;
  lines: string[];
  subLines: string[];
  height: number;
}

/** Flatten the tree, assigning every leaf its own row and centering each
 *  parent over its children's span. */
function layout(root: TreeNode): { placed: Placed[]; rows: number } {
  const placed: Placed[] = [];
  let nextLeafRow = 0;
  let colorIndex = 0;

  const walk = (node: TreeNode, depth: number, parent?: Placed): Placed => {
    const lines = wrapText(node.label, NODE_WIDTH - 20, 13);
    const subLines = node.sublabel
      ? wrapText(node.sublabel, NODE_WIDTH - 16, 10.5)
      : [];
    const entry: Placed = {
      node,
      depth,
      row: 0,
      color: cycleColor(colorIndex++, node.color),
      parent,
      lines,
      subLines,
      height: Math.max(
        MIN_ROW_HEIGHT,
        BOX_PAD * 2 + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE
      )
    };
    placed.push(entry);
    if (!node.children?.length) {
      entry.row = nextLeafRow++;
      return entry;
    }
    const kids = node.children.map((child) => walk(child, depth + 1, entry));
    entry.row = (kids[0].row + kids[kids.length - 1].row) / 2;
    return entry;
  };

  walk(root, 0);
  return { placed, rows: nextLeafRow };
}

export function TreeDiagram({
  root,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: TreeDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.15, animate);
  const stagger = staggerOr(STAGGER);

  const { placed, rows } = layout(root);
  const depth = Math.max(...placed.map((p) => p.depth)) + 1;
  // One row pitch fits the tallest box anywhere in the tree, so wrapped
  // labels grow the whole grid instead of overlapping their neighbours.
  const rowStep = Math.max(...placed.map((p) => p.height)) + ROW_GAP;
  const width = PAD * 2 + depth * NODE_WIDTH + (depth - 1) * COL_GAP;
  const height = PAD * 2 + Math.max(rows, 1) * rowStep - ROW_GAP;

  const nodeX = (p: Placed) => PAD + p.depth * COL_STEP;
  const centerY = (p: Placed) =>
    PAD + p.row * rowStep + rowStep / 2 - ROW_GAP / 2;
  const nodeY = (p: Placed) => centerY(p) - p.height / 2;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {placed.map((p, i) => {
        if (!p.parent) return null;
        const x1 = nodeX(p.parent) + NODE_WIDTH;
        const x2 = nodeX(p);
        const y1 = centerY(p.parent);
        const y2 = centerY(p);

        return (
          <motion.g
            key={`edge-${i}`}
            {...colorProps(p.color)}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.35,
              delay: p.depth * stagger
            })}
          >
            <path
              d={elbowPath(x1, y1, x2, y2, 8)}
              fill="none"
              strokeWidth="1.5"
              style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.65 }}
            />
            {p.node.edgeLabel && (
              <text
                x={(x1 + x2) / 2}
                y={y2 - 6}
                textAnchor="middle"
                fontSize="10.5"
                className="fill-muted-foreground"
              >
                {richInline(p.node.edgeLabel)}
              </text>
            )}
          </motion.g>
        );
      })}

      {placed.map((p, i) => {
        const x = nodeX(p);
        const y = nodeY(p);
        const cx = x + NODE_WIDTH / 2;
        const textTop =
          y +
          (p.height -
            (p.lines.length * LINE_HEIGHT + p.subLines.length * SUB_LINE)) /
            2 +
          LINE_HEIGHT -
          3;

        return (
          <motion.g
            key={`node-${i}`}
            {...colorProps(p.color)}
            {...reveal({
              from: { opacity: 0, x: -4 },
              duration: 0.4,
              delay: p.depth * stagger,
              pulse: p.node.pulse
            })}
          >
            <rect
              x={x}
              y={y}
              width={NODE_WIDTH}
              height={p.height}
              rx="6"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={p.lines}
              x={cx}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={13}
              fontWeight={500}
              className="fill-foreground"
            />
            {p.subLines.length > 0 && (
              <TextBlock
                lines={p.subLines}
                x={cx}
                y={textTop + (p.lines.length - 1) * LINE_HEIGHT + 14}
                lineHeight={SUB_LINE}
                fontSize={10.5}
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
