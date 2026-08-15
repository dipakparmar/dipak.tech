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

export interface NestedBox {
  label: string;
  /** Detail line under the label, inside the same box. */
  sublabel?: string;
  color?: DiagramColor;
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  /** Stacked inside this box, in order. */
  children?: NestedBox[];
}

interface NestedDiagramProps {
  /** Hierarchy by containment — a scope inside a scope, rather than lines
   *  between boxes. Reads best at three or four levels. */
  root: NestedBox;
  ariaLabel: string;
  title?: string;
  caption?: string;
  animate?: DiagramMotion;
  align?: DiagramAlign;
  actions?: DiagramActionsOption;
  className?: string;
}

const WIDTH = 460;
const PAD = 10;
const INSET = 14;
const HEADER = 22;
const LEAF_PAD = 9;
const LINE_HEIGHT = 16;
const SUB_LINE = 13;
const CHILD_GAP = 8;
const STAGGER = 0.09;

interface Placed {
  box: NestedBox;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: DiagramColor;
  lines: string[];
  subLines: string[];
  leaf: boolean;
}

/** Size every box around its children, then place them top-down. */
function layout(root: NestedBox): { placed: Placed[]; height: number } {
  const placed: Placed[] = [];
  let colorIndex = 0;

  const measure = (box: NestedBox, width: number): number => {
    const leaf = !box.children?.length;
    const textWidth = width - (leaf ? LEAF_PAD * 2 + 8 : INSET * 2);
    const lines = wrapText(box.label, textWidth, leaf ? 13 : 13.5);
    const subLines = box.sublabel
      ? wrapText(box.sublabel, textWidth, 10.5)
      : [];
    const own =
      lines.length * LINE_HEIGHT + subLines.length * SUB_LINE + LEAF_PAD * 2;
    if (leaf) return Math.max(38, own);
    const inner = width - INSET * 2;
    const childrenHeight = (box.children ?? []).reduce(
      (sum, child, i) => sum + measure(child, inner) + (i ? CHILD_GAP : 0),
      0
    );
    return HEADER + lines.length * LINE_HEIGHT + childrenHeight + INSET * 1.5;
  };

  const place = (
    box: NestedBox,
    x: number,
    y: number,
    width: number,
    depth: number
  ) => {
    const leaf = !box.children?.length;
    const height = measure(box, width);
    const textWidth = width - (leaf ? LEAF_PAD * 2 + 8 : INSET * 2);
    const lines = wrapText(box.label, textWidth, leaf ? 13 : 13.5);
    const subLines = box.sublabel
      ? wrapText(box.sublabel, textWidth, 10.5)
      : [];
    placed.push({
      box,
      depth,
      x,
      y,
      width,
      height,
      color: cycleColor(colorIndex++, box.color),
      lines,
      subLines,
      leaf
    });
    if (leaf) return height;

    let cursor =
      y + HEADER + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE;
    for (const child of box.children ?? []) {
      const childHeight = place(
        child,
        x + INSET,
        cursor,
        width - INSET * 2,
        depth + 1
      );
      cursor += childHeight + CHILD_GAP;
    }
    return height;
  };

  const total = place(root, PAD, PAD, WIDTH - PAD * 2, 0);
  return { placed, height: total + PAD * 2 };
}

export function NestedDiagram({
  root,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: NestedDiagramProps) {
  const { ref, reveal, staggerOr } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);
  const { placed, height } = layout(root);

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      {...svgLayout(align, WIDTH, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {placed.map((item, i) => (
        <motion.g
          key={i}
          {...colorProps(item.color)}
          {...reveal({
            from: { opacity: 0, scale: 0.985 },
            duration: 0.4,
            delay: item.depth * stagger,
            pulse: item.box.pulse
          })}
          style={{
            transformOrigin: `${item.x + item.width / 2}px ${item.y + item.height / 2}px`
          }}
        >
          <rect
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
            rx="8"
            strokeWidth="1.5"
            style={{
              // Containers stay light so the boxes inside them stay legible;
              // only leaves take the full tint.
              fill: item.leaf ? 'var(--ac-fill)' : 'var(--color-background)',
              stroke: 'var(--mn-color)',
              strokeOpacity: item.leaf ? 1 : 0.65
            }}
          />
          <TextBlock
            lines={item.lines}
            x={item.leaf ? item.x + item.width / 2 : item.x + 12}
            y={item.y + (item.leaf ? item.height / 2 + 4 : 17)}
            lineHeight={LINE_HEIGHT}
            fontSize={item.leaf ? 13 : 13.5}
            fontWeight={500}
            anchor={item.leaf ? 'middle' : 'start'}
            className="fill-foreground"
          />
          {item.subLines.length > 0 && (
            <TextBlock
              lines={item.subLines}
              x={item.leaf ? item.x + item.width / 2 : item.x + 12}
              y={
                item.y +
                (item.leaf ? item.height / 2 + 18 : 17) +
                (item.lines.length - 1) * LINE_HEIGHT +
                (item.leaf ? 0 : 15)
              }
              lineHeight={SUB_LINE}
              fontSize={10.5}
              anchor={item.leaf ? 'middle' : 'start'}
              className="fill-muted-foreground"
            />
          )}
        </motion.g>
      ))}
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
