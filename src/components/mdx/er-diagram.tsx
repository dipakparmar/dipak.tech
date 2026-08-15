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
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';
import { richInline } from './rich-text';

interface Field {
  name: string;
  /** Column type, printed right-aligned in the muted color. */
  type?: string;
  /** `pk` and `fk` get a small tag; the row is emphasized. */
  key?: 'pk' | 'fk';
}

interface Entity {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  name: string;
  fields?: Field[];
  color?: DiagramColor;
}

interface Relation {
  /** Entity names, or 0-based indices. */
  from: string | number;
  to: string | number;
  /** Cardinality printed at each end, e.g. "1" and "n". */
  fromCardinality?: string;
  toCardinality?: string;
  label?: string;
}

interface ErDiagramProps {
  entities: Entity[];
  relations?: Relation[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Entities per row. Two reads best in an article column. */
  columns?: number;
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const PAD = 12;
const BOX_WIDTH = 210;
const COL_GAP = 84;
const ROW_GAP = 40;
const HEADER_HEIGHT = 30;
const FIELD_HEIGHT = 20;
const BOX_PAD = 6;

function resolveEntity(ref: string | number, entities: Entity[]): number {
  if (typeof ref === 'number') return ref;
  const i = entities.findIndex((e) => e.name === ref);
  return i >= 0 ? i : 0;
}
const STAGGER = 0.08;

export function ErDiagram({
  entities,
  relations = [],
  ariaLabel,
  title,
  caption,
  columns = 2,
  animate,
  align,
  className
}: ErDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.15, animate);
  const stagger = staggerOr(STAGGER);

  const cols = Math.max(1, Math.min(columns, entities.length));
  const boxes = entities.map((entity, i) => {
    const fields = entity.fields ?? [];
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...entity,
      col,
      row,
      fields,
      color: cycleColor(i, entity.color),
      height: HEADER_HEIGHT + fields.length * FIELD_HEIGHT + BOX_PAD * 2
    };
  });

  const rowCount = Math.max(...boxes.map((b) => b.row)) + 1;
  const rowHeights = Array.from({ length: rowCount }, (_, r) =>
    Math.max(...boxes.filter((b) => b.row === r).map((b) => b.height))
  );
  const rowY: number[] = [];
  let cursor = PAD;
  rowHeights.forEach((h, i) => {
    rowY[i] = cursor;
    cursor += h + ROW_GAP;
  });

  const width = PAD * 2 + cols * BOX_WIDTH + (cols - 1) * COL_GAP;
  const height = cursor - ROW_GAP + PAD;
  const boxX = (b: (typeof boxes)[number]) =>
    PAD + b.col * (BOX_WIDTH + COL_GAP);
  const boxY = (b: (typeof boxes)[number]) => rowY[b.row];

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {relations.map((rel, i) => {
        const a = boxes[resolveEntity(rel.from, entities)];
        const b = boxes[resolveEntity(rel.to, entities)];
        const ay = boxY(a) + a.height / 2;
        const by = boxY(b) + b.height / 2;
        // Leave from whichever side faces the other entity.
        const leftToRight = boxX(a) <= boxX(b);
        const sameColumn = a.col === b.col;
        const x1 = sameColumn
          ? boxX(a) + BOX_WIDTH / 2
          : boxX(a) + (leftToRight ? BOX_WIDTH : 0);
        const x2 = sameColumn
          ? boxX(b) + BOX_WIDTH / 2
          : boxX(b) + (leftToRight ? 0 : BOX_WIDTH);
        const y1 = sameColumn ? boxY(a) + (by > ay ? a.height : 0) : ay;
        const y2 = sameColumn ? boxY(b) + (by > ay ? 0 : b.height) : by;
        const d = sameColumn
          ? `M ${x1} ${y1} V ${y2}`
          : elbowPath(x1, y1, x2, y2, 8);

        return (
          <motion.g
            key={`rel-${i}`}
            {...reveal({ from: { opacity: 0 }, duration: 0.4, delay: 0.3 })}
          >
            <path
              d={d}
              fill="none"
              strokeWidth="1.5"
              className="stroke-muted-foreground"
            />
            {rel.fromCardinality && (
              <text
                x={x1 + (sameColumn ? 8 : leftToRight ? 6 : -6)}
                y={y1 - 6}
                textAnchor={sameColumn || leftToRight ? 'start' : 'end'}
                fontSize="10.5"
                className="fill-muted-foreground"
              >
                {rel.fromCardinality}
              </text>
            )}
            {rel.toCardinality && (
              <text
                x={x2 + (sameColumn ? 8 : leftToRight ? -6 : 6)}
                y={y2 - 6}
                textAnchor={
                  sameColumn ? 'start' : leftToRight ? 'end' : 'start'
                }
                fontSize="10.5"
                className="fill-muted-foreground"
              >
                {rel.toCardinality}
              </text>
            )}
            {rel.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                fontSize="10.5"
                className="fill-muted-foreground"
              >
                {richInline(rel.label)}
              </text>
            )}
          </motion.g>
        );
      })}

      {boxes.map((entity, i) => {
        const x = boxX(entity);
        const y = boxY(entity);

        return (
          <motion.g
            key={i}
            {...colorProps(entity.color)}
            {...reveal({
              from: { opacity: 0, y: 4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: entity.pulse
            })}
          >
            <rect
              x={x}
              y={y}
              width={BOX_WIDTH}
              height={entity.height}
              rx="6"
              strokeWidth="1.5"
              style={{
                fill: 'var(--color-background)',
                stroke: 'var(--mn-color)'
              }}
            />
            <path
              d={`M ${x} ${y + HEADER_HEIGHT} h ${BOX_WIDTH}`}
              strokeWidth="1"
              style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.5 }}
            />
            <rect
              x={x}
              y={y}
              width={BOX_WIDTH}
              height={HEADER_HEIGHT}
              rx="6"
              style={{ fill: 'var(--ac-fill)' }}
            />
            <TextBlock
              lines={wrapText(entity.name, BOX_WIDTH - 20, 13)}
              x={x + BOX_WIDTH / 2}
              y={y + 19}
              lineHeight={15}
              fontSize={13}
              fontWeight={500}
              className="fill-foreground"
            />
            {entity.fields.map((field, fi) => {
              const fy = y + HEADER_HEIGHT + BOX_PAD + fi * FIELD_HEIGHT + 14;
              return (
                <g key={fi}>
                  {field.key && (
                    <text
                      x={x + 10}
                      y={fy}
                      fontSize="8.5"
                      letterSpacing="0.08em"
                      style={{ fill: 'var(--mn-color)' }}
                    >
                      {field.key.toUpperCase()}
                    </text>
                  )}
                  <text
                    x={x + (field.key ? 34 : 10)}
                    y={fy}
                    fontSize="11.5"
                    fontWeight={field.key === 'pk' ? 500 : 400}
                    className="fill-foreground"
                  >
                    {richInline(field.name)}
                  </text>
                  {field.type && (
                    <text
                      x={x + BOX_WIDTH - 10}
                      y={fy}
                      textAnchor="end"
                      fontSize="10.5"
                      className="fill-muted-foreground"
                    >
                      {field.type}
                    </text>
                  )}
                </g>
              );
            })}
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
