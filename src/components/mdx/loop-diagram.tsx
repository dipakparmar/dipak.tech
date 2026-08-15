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

interface LoopStep {
  label: string;
  /** Detail line inside the box. */
  sublabel?: string;
  color?: DiagramColor;
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
}

interface LoopDiagramProps {
  /** Steps of a reinforcing cycle, clockwise from the top. Each one feeds the
   *  next and the last feeds the first. */
  steps: LoopStep[];
  /** What the cycle accumulates, named in the middle. */
  hub?: { label: string; sublabel?: string; color?: DiagramColor };
  ariaLabel: string;
  title?: string;
  caption?: string;
  animate?: DiagramMotion;
  align?: DiagramAlign;
  actions?: DiagramActionsOption;
  className?: string;
}

const BOX_WIDTH = 150;
const MIN_HEIGHT = 50;
const BOX_PAD = 11;
const LINE_HEIGHT = 16;
const SUB_LINE = 12;
const PAD = 18;
const HUB_RADIUS = 62;
const STAGGER = 0.14;

export function LoopDiagram({
  steps,
  hub,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: LoopDiagramProps) {
  const { ref, reveal, staggerOr } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const nodes = steps.map((step, i) => {
    const lines = wrapText(step.label, BOX_WIDTH - 22, 13.5);
    const subLines = step.sublabel
      ? wrapText(step.sublabel, BOX_WIDTH - 18, 10.5)
      : [];
    return {
      ...step,
      lines,
      subLines,
      color: cycleColor(i, step.color),
      height: Math.max(
        MIN_HEIGHT,
        BOX_PAD * 2 + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE
      )
    };
  });

  const n = nodes.length;
  const maxHeight = Math.max(...nodes.map((s) => s.height));
  // Wide enough that neighbouring boxes clear each other, and — with a hub —
  // that a box sitting beside the circle clears it too. A box reaches
  // BOX_WIDTH/2 towards the centre horizontally and maxHeight/2 vertically,
  // so the binding constraint is the larger of the two.
  const radius = Math.max(
    120,
    hub ? HUB_RADIUS + Math.max(BOX_WIDTH, maxHeight) / 2 + 22 : 0,
    (n * (BOX_WIDTH + 46)) / (2 * Math.PI),
    (n * (maxHeight + 46)) / (2 * Math.PI)
  );
  const cx = PAD + radius + BOX_WIDTH / 2;
  const cy = PAD + radius + maxHeight / 2;
  const width = cx * 2;
  const height = cy * 2;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i: number) => ({
    x: cx + radius * Math.cos(angleFor(i)),
    y: cy + radius * Math.sin(angleFor(i))
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
        {nodes.map((node, i) => (
          <marker
            key={i}
            id={`loop-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <g {...colorProps(node.color)}>
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                style={{ fill: 'var(--mn-color)' }}
              />
            </g>
          </marker>
        ))}
      </defs>

      {nodes.map((node, i) => {
        // An arc along the ring from this step to the next, drawn in the gap
        // between the two boxes rather than through them.
        const gap = Math.PI / n / 2.1;
        const from = angleFor(i) + gap;
        const to = angleFor(i + 1) - gap;
        const r = radius;
        const p1 = { x: cx + r * Math.cos(from), y: cy + r * Math.sin(from) };
        const p2 = { x: cx + r * Math.cos(to), y: cy + r * Math.sin(to) };

        return (
          <motion.g
            key={`arc-${i}`}
            {...colorProps(node.color)}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.25 + i * stagger
            })}
          >
            <path
              d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
              fill="none"
              strokeWidth="1.5"
              style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.75 }}
              markerEnd={`url(#loop-arrow-${i})`}
            />
          </motion.g>
        );
      })}

      {hub && (
        <motion.g
          {...colorProps(hub.color ?? 'neutral')}
          {...reveal({ from: { opacity: 0, scale: 0.9 }, duration: 0.45 })}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={HUB_RADIUS}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
          />
          <TextBlock
            lines={wrapText(hub.label, HUB_RADIUS * 1.7, 13.5)}
            x={cx}
            y={cy + (hub.sublabel ? -2 : 5)}
            lineHeight={LINE_HEIGHT}
            fontSize={13.5}
            fontWeight={500}
            className="fill-foreground"
          />
          {hub.sublabel && (
            <TextBlock
              lines={wrapText(hub.sublabel, HUB_RADIUS * 1.7, 10.5)}
              x={cx}
              y={cy + 16}
              lineHeight={12}
              fontSize={10.5}
              className="fill-muted-foreground"
            />
          )}
        </motion.g>
      )}

      {nodes.map((node, i) => {
        const p = at(i);
        const x = p.x - BOX_WIDTH / 2;
        const y = p.y - node.height / 2;
        const textTop =
          y +
          (node.height -
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
              from: { opacity: 0, scale: 0.9 },
              duration: 0.4,
              delay: i * stagger,
              pulse: node.pulse
            })}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            <rect
              x={x}
              y={y}
              width={BOX_WIDTH}
              height={node.height}
              rx="8"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={node.lines}
              x={p.x}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={13.5}
              fontWeight={500}
              className="fill-foreground"
            />
            {node.subLines.length > 0 && (
              <TextBlock
                lines={node.subLines}
                x={p.x}
                y={textTop + (node.lines.length - 1) * LINE_HEIGHT + 13}
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
