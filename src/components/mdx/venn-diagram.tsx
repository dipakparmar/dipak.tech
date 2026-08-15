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

interface VennSet {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** Detail line under the set name, outside the circle. */
  sublabel?: string;
  color?: DiagramColor;
}

interface VennOverlap {
  /** Indices of the sets that overlap. Two for a pair, three for the center. */
  between: number[];
  label: string;
}

interface VennDiagramProps {
  /** Two or three sets. More than three can't be drawn honestly with circles. */
  sets: VennSet[];
  /** What lives in each intersection. */
  overlaps?: VennOverlap[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const R = 96;
const PAD = 24;
const OFFSET = 62;
const LINE_HEIGHT = 14;
const STAGGER = 0.12;

export function VennDiagram({
  sets,
  overlaps = [],
  ariaLabel,
  title,
  caption,
  animate,
  align,
  className
}: VennDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const three = sets.length >= 3;
  const width = PAD * 2 + (three ? OFFSET * 2 + R * 2 : OFFSET * 2 + R * 2);
  const height = PAD * 2 + (three ? R * 2 + OFFSET + 40 : R * 2 + 44);
  const cx = width / 2;
  const cy = PAD + R + (three ? 0 : 8);

  // Two sets sit side by side; three form a triangle with the odd one below.
  const centers = three
    ? [
        { x: cx - OFFSET, y: cy },
        { x: cx + OFFSET, y: cy },
        { x: cx, y: cy + OFFSET }
      ]
    : [
        { x: cx - OFFSET, y: cy },
        { x: cx + OFFSET, y: cy }
      ];

  const midpoint = (idx: number[]) => ({
    x: idx.reduce((sum, i) => sum + (centers[i]?.x ?? cx), 0) / idx.length,
    y: idx.reduce((sum, i) => sum + (centers[i]?.y ?? cy), 0) / idx.length
  });

  // Labels sit outside their circle, pushed away from the cluster center.
  const labelPos = (i: number) => {
    const c = centers[i];
    if (three && i === 2)
      return { x: c.x, y: c.y + R + 20, anchor: 'middle' as const };
    return {
      x: c.x + (i === 0 ? -R + 18 : R - 18),
      y: c.y - R - 8,
      anchor: (i === 0 ? 'start' : 'end') as 'start' | 'end'
    };
  };

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {centers.map((c, i) => (
        <motion.g
          key={i}
          {...colorProps(cycleColor(i, sets[i].color))}
          {...reveal({
            from: { opacity: 0, scale: 0.9 },
            duration: 0.45,
            delay: i * stagger,
            pulse: sets[i].pulse
          })}
          style={{ transformOrigin: `${c.x}px ${c.y}px` }}
        >
          <circle
            cx={c.x}
            cy={c.y}
            r={R}
            strokeWidth="1.5"
            style={{
              fill: 'var(--mn-color)',
              fillOpacity: 0.14,
              stroke: 'var(--mn-color)'
            }}
          />
        </motion.g>
      ))}

      {sets.map((set, i) => {
        const p = labelPos(i);
        const lines = wrapText(set.label, 150, 13);
        const subLines = set.sublabel ? wrapText(set.sublabel, 150, 10.5) : [];
        return (
          <motion.g
            key={`label-${i}`}
            {...colorProps(cycleColor(i, set.color))}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.2 + i * 0.1
            })}
          >
            <TextBlock
              lines={lines}
              x={p.x}
              y={p.y}
              lineHeight={LINE_HEIGHT}
              fontSize={13}
              fontWeight={500}
              anchor={p.anchor}
              style={{ fill: 'var(--mn-color)' }}
            />
            {subLines.length > 0 && (
              <TextBlock
                lines={subLines}
                x={p.x}
                y={p.y + lines.length * LINE_HEIGHT}
                lineHeight={12}
                fontSize={10.5}
                anchor={p.anchor}
                className="fill-muted-foreground"
              />
            )}
          </motion.g>
        );
      })}

      {overlaps.map((overlap, i) => {
        const p = midpoint(overlap.between);
        const lines = wrapText(overlap.label, 96, 11);
        return (
          <motion.g
            key={`overlap-${i}`}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.5 + i * 0.08
            })}
          >
            <TextBlock
              lines={lines}
              x={p.x}
              y={p.y - ((lines.length - 1) * 13) / 2 + 4}
              lineHeight={13}
              fontSize={11}
              className="fill-foreground"
            />
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
