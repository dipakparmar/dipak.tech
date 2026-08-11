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
import { richInline } from './rich-text';

interface Branch {
  label: string;
  /** Printed on the arrow into this branch. Defaults to "no". */
  edgeLabel?: string;
  color?: DiagramColor;
}

interface FlowchartStep {
  /** `decision` draws a diamond; `terminal` a pill; `step` a box. */
  type?: 'step' | 'decision' | 'terminal';
  label: string;
  sublabel?: string;
  color?: DiagramColor;
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  /** Printed on the arrow leaving this step downward. */
  edgeLabel?: string;
  /**
   * A decision's off-path outcome, drawn to the right and ending there.
   * Rejoining the main column isn't modelled: a flowchart that needs it is
   * past the point where a single column reads clearly.
   */
  branch?: Branch;
}

interface FlowchartDiagramProps {
  /** The main path, top to bottom. Branches hang off it to the right. */
  steps: FlowchartStep[];
  ariaLabel: string;
  title?: string;
  caption?: string;
  animate?: DiagramMotion;
  align?: DiagramAlign;
  actions?: DiagramActionsOption;
  className?: string;
}

const PAD = 12;
const COL_WIDTH = 260;
const BRANCH_WIDTH = 168;
const BRANCH_GAP = 44;
const MIN_HEIGHT = 52;
const DIAMOND_MIN = 78;
const BOX_PAD = 12;
const LINE_HEIGHT = 17;
const SUB_LINE = 13;
const GAP = 46;
const STAGGER = 0.14;

export function FlowchartDiagram({
  steps,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: FlowchartDiagramProps) {
  const { ref, reveal, staggerOr } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const hasBranch = steps.some((s) => s.branch);
  const width =
    PAD * 2 + COL_WIDTH + (hasBranch ? BRANCH_GAP + BRANCH_WIDTH : 0);
  const colX = PAD;
  const centerX = colX + COL_WIDTH / 2;

  const rows = steps.map((step, i) => {
    const decision = step.type === 'decision';
    // A diamond wastes its corners, so its text gets a narrower box.
    const textWidth = decision ? COL_WIDTH * 0.52 : COL_WIDTH - 32;
    const lines = wrapText(step.label, textWidth, 14);
    const subLines = step.sublabel
      ? wrapText(step.sublabel, textWidth, 11)
      : [];
    const content =
      BOX_PAD * 2 + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE;
    return {
      ...step,
      decision,
      lines,
      subLines,
      color: cycleColor(i, step.color),
      height: Math.max(
        decision ? DIAMOND_MIN : MIN_HEIGHT,
        decision ? content * 1.5 : content
      )
    };
  });

  const rowY: number[] = [];
  let cursor = PAD;
  rows.forEach((r, i) => {
    rowY[i] = cursor;
    cursor += r.height + GAP;
  });
  const height = cursor - GAP + PAD;

  const svg = (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {rows.map((row, i) => (
          <marker
            key={i}
            id={`chart-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <g {...colorProps(row.color)}>
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                style={{ fill: 'var(--mn-color)' }}
              />
            </g>
          </marker>
        ))}
      </defs>

      {rows.map((row, i) => {
        const y = rowY[i];
        const next = rowY[i + 1];
        const boxWidth = row.decision ? COL_WIDTH * 0.78 : COL_WIDTH;
        const boxX = centerX - boxWidth / 2;
        const midY = y + row.height / 2;
        const textTop =
          y +
          (row.height -
            (row.lines.length * LINE_HEIGHT + row.subLines.length * SUB_LINE)) /
            2 +
          LINE_HEIGHT -
          4;
        const radius = row.type === 'terminal' ? row.height / 2 : 8;

        return (
          <motion.g
            key={i}
            {...colorProps(row.color)}
            {...reveal({
              from: { opacity: 0, y: 4 },
              duration: 0.4,
              delay: i * stagger,
              pulse: row.pulse
            })}
          >
            {row.decision ? (
              <path
                d={`M ${centerX} ${y} L ${boxX + boxWidth} ${midY} L ${centerX} ${y + row.height} L ${boxX} ${midY} Z`}
                strokeWidth="1.5"
                strokeLinejoin="round"
                style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
              />
            ) : (
              <rect
                x={boxX}
                y={y}
                width={boxWidth}
                height={row.height}
                rx={radius}
                strokeWidth="1.5"
                style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
              />
            )}
            <TextBlock
              lines={row.lines}
              x={centerX}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={14}
              fontWeight={500}
              className="fill-foreground"
            />
            {row.subLines.length > 0 && (
              <TextBlock
                lines={row.subLines}
                x={centerX}
                y={textTop + (row.lines.length - 1) * LINE_HEIGHT + 14}
                lineHeight={SUB_LINE}
                fontSize={11}
                className="fill-muted-foreground"
              />
            )}

            {next !== undefined && (
              <>
                <path
                  d={`M ${centerX} ${y + row.height} V ${next}`}
                  fill="none"
                  strokeWidth="1.5"
                  style={{ stroke: 'var(--mn-color)' }}
                  markerEnd={`url(#chart-arrow-${i})`}
                />
                {row.edgeLabel && (
                  <text
                    x={centerX + 8}
                    y={y + row.height + GAP / 2 + 4}
                    fontSize="11"
                    className="fill-muted-foreground"
                  >
                    {richInline(row.edgeLabel)}
                  </text>
                )}
              </>
            )}

            {row.branch && (
              <>
                <path
                  d={`M ${boxX + boxWidth} ${midY} H ${colX + COL_WIDTH + BRANCH_GAP}`}
                  fill="none"
                  strokeWidth="1.5"
                  style={{ stroke: 'var(--mn-color)' }}
                  markerEnd={`url(#chart-arrow-${i})`}
                />
                <text
                  x={
                    boxX +
                    boxWidth +
                    (BRANCH_GAP + (COL_WIDTH - boxWidth) / 2) / 2
                  }
                  y={midY - 7}
                  textAnchor="middle"
                  fontSize="11"
                  className="fill-muted-foreground"
                >
                  {richInline(row.branch.edgeLabel ?? 'no')}
                </text>
              </>
            )}
          </motion.g>
        );
      })}

      {rows.map((row, i) => {
        if (!row.branch) return null;
        const branchLines = wrapText(row.branch.label, BRANCH_WIDTH - 28, 13);
        const boxHeight = Math.max(
          44,
          BOX_PAD * 2 + branchLines.length * LINE_HEIGHT
        );
        const x = colX + COL_WIDTH + BRANCH_GAP;
        const y = rowY[i] + row.height / 2 - boxHeight / 2;

        return (
          <motion.g
            key={`branch-${i}`}
            {...colorProps(row.branch.color ?? row.color)}
            {...reveal({
              from: { opacity: 0, x: -4 },
              duration: 0.4,
              delay: i * stagger + 0.15
            })}
          >
            <rect
              x={x}
              y={y}
              width={BRANCH_WIDTH}
              height={boxHeight}
              rx="8"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            <TextBlock
              lines={branchLines}
              x={x + BRANCH_WIDTH / 2}
              y={
                y +
                (boxHeight - branchLines.length * LINE_HEIGHT) / 2 +
                LINE_HEIGHT -
                4
              }
              lineHeight={LINE_HEIGHT}
              fontSize={13}
              fontWeight={500}
              className="fill-foreground"
            />
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
