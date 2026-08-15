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
import { richInline } from './rich-text';

interface Layer {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** Detail line under the layer name. */
  sublabel?: string;
  /** Short uppercase tag drawn in the left corner of the box. */
  tag?: string;
  color?: DiagramColor;
  /** Aside hanging off the right edge of this layer. */
  note?: string;
}

interface LayerStackProps {
  /** Top layer first — the same order a reader would say them out loud. */
  layers: Layer[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /** Arrow down the left edge showing which way the stack is traversed. */
  axis?: { label: string; direction?: 'down' | 'up' };
  /** `false` to render with no entrance, or `{ speed, stagger, once }`. */
  animate?: DiagramMotion;
  align?: DiagramAlign;
  className?: string;
}

const PAD = 12;
const AXIS_WIDTH = 34;
const NOTE_WIDTH = 150;
const BOX_WIDTH = 340;
const MIN_HEIGHT = 52;
const BOX_PAD = 12;
const LINE_HEIGHT = 17;
const SUB_LINE = 14;
const NOTE_LINE = 12;
const LAYER_GAP = 8;
const STAGGER = 0.12;

export function LayerStack({
  layers,
  ariaLabel,
  title,
  caption,
  axis,
  animate,
  align,
  className
}: LayerStackProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const hasNote = layers.some((l) => l.note);
  const axisWidth = axis ? AXIS_WIDTH : 0;
  const boxX = PAD + axisWidth;
  const width = boxX + BOX_WIDTH + (hasNote ? NOTE_WIDTH : 0) + PAD;

  const rows = layers.map((l) => {
    const lines = wrapText(l.label, BOX_WIDTH - 32, 14);
    const subLines = l.sublabel ? wrapText(l.sublabel, BOX_WIDTH - 28, 11) : [];
    const noteLines = l.note ? wrapText(l.note, NOTE_WIDTH - 26, 10.5) : [];
    const tagRoom = l.tag ? 8 : 0;
    return {
      ...l,
      lines,
      subLines,
      noteLines,
      height: Math.max(
        MIN_HEIGHT,
        BOX_PAD * 2 +
          tagRoom +
          lines.length * LINE_HEIGHT +
          subLines.length * SUB_LINE,
        noteLines.length * NOTE_LINE + 16
      )
    };
  });

  const layerY: number[] = [];
  let cursor = PAD;
  rows.forEach((r, i) => {
    layerY[i] = cursor;
    cursor += r.height + LAYER_GAP;
  });
  const height = cursor - LAYER_GAP + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <marker
          id="layer-axis-arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
        </marker>
      </defs>

      {axis && (
        <motion.g {...reveal({ from: { opacity: 0 }, duration: 0.4 })}>
          <line
            x1={PAD + 24}
            y1={axis.direction === 'up' ? height - PAD : PAD}
            x2={PAD + 24}
            y2={axis.direction === 'up' ? PAD : height - PAD}
            strokeWidth="1.5"
            className="stroke-muted-foreground"
            markerEnd="url(#layer-axis-arrow)"
          />
          <text
            x={PAD + 9}
            y={height / 2}
            fontSize="10.5"
            textAnchor="middle"
            className="fill-muted-foreground"
            transform={`rotate(-90 ${PAD + 9} ${height / 2})`}
          >
            {richInline(axis.label)}
          </text>
        </motion.g>
      )}

      {rows.map((layer, i) => {
        const y = layerY[i];
        const color = cycleColor(i, layer.color);
        const cx = boxX + BOX_WIDTH / 2;
        const tagRoom = layer.tag ? 8 : 0;
        const textTop =
          y +
          tagRoom +
          (layer.height -
            tagRoom -
            (layer.lines.length * LINE_HEIGHT +
              layer.subLines.length * SUB_LINE)) /
            2 +
          LINE_HEIGHT -
          4;

        return (
          <motion.g
            key={i}
            {...colorProps(color)}
            {...reveal({
              from: { opacity: 0, y: -4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: layer.pulse
            })}
          >
            <rect
              x={boxX}
              y={y}
              width={BOX_WIDTH}
              height={layer.height}
              rx="6"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            {layer.tag && (
              <text
                x={boxX + 12}
                y={y + 16}
                fontSize="9"
                letterSpacing="0.1em"
                style={{ fill: 'var(--mn-color)' }}
              >
                {layer.tag.toUpperCase()}
              </text>
            )}
            <TextBlock
              lines={layer.lines}
              x={cx}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={14}
              fontWeight={500}
              className="fill-foreground"
            />
            {layer.subLines.length > 0 && (
              <TextBlock
                lines={layer.subLines}
                x={cx}
                y={textTop + (layer.lines.length - 1) * LINE_HEIGHT + 15}
                lineHeight={SUB_LINE}
                fontSize={11}
                className="fill-muted-foreground"
              />
            )}
            {layer.noteLines.length > 0 && (
              <>
                <line
                  x1={boxX + BOX_WIDTH}
                  y1={y + layer.height / 2}
                  x2={boxX + BOX_WIDTH + 14}
                  y2={y + layer.height / 2}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground"
                />
                <TextBlock
                  lines={layer.noteLines}
                  x={boxX + BOX_WIDTH + 20}
                  y={
                    y +
                    layer.height / 2 -
                    ((layer.noteLines.length - 1) * NOTE_LINE) / 2 +
                    4
                  }
                  lineHeight={NOTE_LINE}
                  fontSize={10.5}
                  anchor="start"
                  className="fill-muted-foreground"
                />
              </>
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
