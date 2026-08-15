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

interface PyramidLayer {
  label: string;
  /** Printed to the right of the band — a count, a rate, a caveat. */
  note?: string;
  color?: DiagramColor;
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
}

interface PyramidDiagramProps {
  /** Widest band first. */
  layers: PyramidLayer[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  /**
   * `up` narrows towards the top — a hierarchy with few at the peak.
   * `down` narrows towards the bottom — a funnel losing volume at each step.
   */
  direction?: 'up' | 'down';
  animate?: DiagramMotion;
  align?: DiagramAlign;
  actions?: DiagramActionsOption;
  className?: string;
}

const PAD = 12;
const BASE_WIDTH = 340;
const NOTE_WIDTH = 130;
const BAND_HEIGHT = 56;
const BAND_GAP = 4;
const LINE_HEIGHT = 16;
const NARROWEST = 0.34;
const STAGGER = 0.12;

export function PyramidDiagram({
  layers,
  ariaLabel,
  title,
  caption,
  direction = 'down',
  animate,
  align,
  actions,
  className
}: PyramidDiagramProps) {
  const { ref, reveal, staggerOr } = useReveal<SVGSVGElement>(0.25, animate);
  const stagger = staggerOr(STAGGER);

  const hasNote = layers.some((l) => l.note);
  const width = PAD * 2 + BASE_WIDTH + (hasNote ? NOTE_WIDTH : 0);
  const centerX = PAD + BASE_WIDTH / 2;

  // Each band is a trapezoid: its top edge is the previous band's bottom, so
  // the stack reads as one solid shape rather than a pile of boxes.
  const widthAt = (index: number) => {
    const t = layers.length === 1 ? 0 : index / layers.length;
    return BASE_WIDTH * Math.max(NARROWEST, 1 - t);
  };

  // A band grows to fit a wrapped label, like every other diagram's box. The
  // narrow end of a funnel is exactly where two-line labels turn up.
  const bands = layers.map((layer, i) => {
    const step = direction === 'up' ? layers.length - 1 - i : i;
    const top = widthAt(step);
    const bottom = widthAt(step + 1);
    const lines = wrapText(layer.label, Math.min(top, bottom) - 16, 13.5);
    return {
      ...layer,
      top,
      bottom,
      lines,
      height: Math.max(BAND_HEIGHT, lines.length * LINE_HEIGHT + 22)
    };
  });
  const bandY: number[] = [];
  let cursor = PAD;
  bands.forEach((band, i) => {
    bandY[i] = cursor;
    cursor += band.height + BAND_GAP;
  });
  const height = cursor - BAND_GAP + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {bands.map((layer, i) => {
        // `up` draws the widest band at the bottom, so the geometry is the
        // same shape read from the other end.
        const { top, bottom, lines } = layer;
        const y = bandY[i];
        const textTop =
          y + (layer.height - lines.length * LINE_HEIGHT) / 2 + LINE_HEIGHT - 4;

        return (
          <motion.g
            key={i}
            {...colorProps(cycleColor(i, layer.color))}
            {...reveal({
              from: { opacity: 0, y: -4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: layer.pulse
            })}
          >
            <path
              d={
                `M ${centerX - top / 2} ${y} ` +
                `H ${centerX + top / 2} ` +
                `L ${centerX + bottom / 2} ${y + layer.height} ` +
                `H ${centerX - bottom / 2} Z`
              }
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={lines}
              x={centerX}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={13.5}
              fontWeight={500}
              className="fill-foreground"
            />
            {layer.note && (
              <TextBlock
                lines={wrapText(layer.note, NOTE_WIDTH - 16, 11)}
                x={PAD + BASE_WIDTH + 12}
                y={y + layer.height / 2 + 4}
                lineHeight={13}
                fontSize={11}
                anchor="start"
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
