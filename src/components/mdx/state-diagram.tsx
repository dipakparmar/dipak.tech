'use client';

import { motion } from 'motion/react';
import {
  colorProps,
  cycleColor,
  DiagramFigure,
  measureText,
  svgLayout,
  TextBlock,
  useReveal,
  wrapText,
  type DiagramActionsOption,
  type DiagramAlign,
  type DiagramColor,
  type DiagramMotion
} from './diagram-kit';

interface State {
  /** Breathe on a loop once revealed, to mark the element worth looking at. */
  pulse?: boolean;
  label: string;
  /** Detail line inside the box — a guard, an owner, a timeout. */
  sublabel?: string;
  color?: DiagramColor;
  /** Entry point: draws the filled start dot and its arrow. */
  initial?: boolean;
  /** Terminal state: drawn with a double border. */
  final?: boolean;
}

interface Transition {
  /** State label (or 0-based index). Equal values draw a self-transition. */
  from: string | number;
  to: string | number;
  /** The event or guard that fires it. */
  label?: string;
  dashed?: boolean;
  color?: DiagramColor;
}

interface StateDiagramProps {
  /** States are laid out on a ring, clockwise from the top, so a cycle
   *  reads as a cycle and any pair can be connected without crossings. */
  states: State[];
  transitions: Transition[];
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

const BOX_WIDTH = 128;
const MIN_BOX_HEIGHT = 44;
const BOX_PAD = 10;
const LINE_HEIGHT = 15;
const SUB_LINE = 12;
const PAD = 34;
// Extra canvas room for self-transitions, which bow outside the ring.
const SELF_BOW = 46;
// How far along the outward edge each end of a self-loop sits.
const SELF_FOOT = 13;
const LABEL_LINE = 12;
const STAGGER = 0.12;

/** Where the ray from a box's center toward (tx, ty) leaves the box. */
function edgePoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  tx: number,
  ty: number
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const scale = Math.min(
    Math.abs(dx) > 1e-6 ? w / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) > 1e-6 ? h / 2 / Math.abs(dy) : Infinity
  );
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function resolveState(ref: string | number, states: State[]): number {
  if (typeof ref === 'number') return ref;
  const i = states.findIndex((s) => s.label === ref);
  return i >= 0 ? i : 0;
}

export function StateDiagram({
  states,
  transitions,
  ariaLabel,
  title,
  caption,
  animate,
  align,
  actions,
  className
}: StateDiagramProps) {
  const { ref, staggerOr, reveal } = useReveal<SVGSVGElement>(0.2, animate);
  const stagger = staggerOr(STAGGER);

  const nodes = states.map((s, i) => {
    const lines = wrapText(s.label, BOX_WIDTH - 20, 13);
    const subLines = s.sublabel ? wrapText(s.sublabel, BOX_WIDTH - 16, 10) : [];
    return {
      ...s,
      lines,
      subLines,
      color: cycleColor(i, s.color),
      height: Math.max(
        MIN_BOX_HEIGHT,
        BOX_PAD * 2 + lines.length * LINE_HEIGHT + subLines.length * SUB_LINE
      )
    };
  });

  const n = nodes.length;
  const maxHeight = Math.max(...nodes.map((s) => s.height));
  // Ring radius grows with the node count so neighbouring boxes keep a gap
  // wide enough for the transition label that sits between them.
  const radius = Math.max(
    120,
    (n * (BOX_WIDTH + 84)) / (2 * Math.PI),
    (n * (maxHeight + 72)) / (2 * Math.PI)
  );
  // Laid out around an arbitrary origin; the canvas is cropped to whatever
  // was actually drawn at the end, so a self-loop or a long label gets room
  // without padding every other side to match.
  const cx = radius + BOX_WIDTH / 2;
  const cy = radius + maxHeight / 2;

  const pos = nodes.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle
    };
  });

  const edges = transitions.map((t) => {
    const from = resolveState(t.from, states);
    const to = resolveState(t.to, states);
    return { ...t, from, to, color: t.color ?? nodes[from].color };
  });

  const curves = edges.map((e) => {
    const a = pos[e.from];
    const b = pos[e.to];
    const ah = nodes[e.from].height;
    const bh = nodes[e.to].height;
    const isSelf = e.from === e.to;
    // Radially outward from the ring centre, and the tangent across it.
    const outward = { x: Math.cos(a.angle), y: Math.sin(a.angle) };
    const tangent = { x: -outward.y, y: outward.x };

    // A self-transition is a loop hung off the outward-facing edge, clear of
    // the box. Anchoring it on the corners instead tucks it against the label
    // and reads as a stray mark rather than a transition.
    if (isSelf) {
      const edge = edgePoint(
        a.x,
        a.y,
        BOX_WIDTH,
        ah,
        a.x + outward.x * 1000,
        a.y + outward.y * 1000
      );
      const foot = SELF_FOOT;
      const start = {
        x: edge.x + tangent.x * foot,
        y: edge.y + tangent.y * foot
      };
      const end = {
        x: edge.x - tangent.x * foot,
        y: edge.y - tangent.y * foot
      };
      const reach = SELF_BOW;
      const c1 = {
        x: start.x + outward.x * reach + tangent.x * foot,
        y: start.y + outward.y * reach + tangent.y * foot
      };
      const c2 = {
        x: end.x + outward.x * reach - tangent.x * foot,
        y: end.y + outward.y * reach - tangent.y * foot
      };
      const labelLines = e.label ? wrapText(e.label, 108, 10.5) : [];
      const labelWidth = Math.max(
        ...labelLines.map((l) => measureText(l, 10.5)),
        10
      );
      const tip = {
        x: edge.x + outward.x * (reach * 0.78 + labelWidth / 2 + 10),
        y: edge.y + outward.y * (reach * 0.78 + 12)
      };
      return {
        e,
        d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
        ctrl: { x: c1.x, y: c1.y },
        ctrl2: { x: c2.x, y: c2.y },
        labelLines,
        labelWidth,
        lx: tip.x,
        ly: tip.y
      };
    }

    const start = edgePoint(a.x, a.y, BOX_WIDTH, ah, b.x, b.y);
    const end = edgePoint(b.x, b.y, BOX_WIDTH, bh, a.x, a.y);
    // Bow each curve to one side so a pair of opposite transitions
    // between the same two states stays separately traceable.
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dist = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const bow = dist * 0.16;
    const nx = -(end.y - start.y) / dist;
    const ny = (end.x - start.x) / dist;
    const ctrl = { x: mx + nx * bow, y: my + ny * bow };
    const path = `M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
    // Midpoint of the quadratic, nudged further from the ring centre so
    // the label lands in open space rather than on top of a box.
    const midCurveX = 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x;
    const midCurveY = 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y;
    const away = Math.hypot(midCurveX - cx, midCurveY - cy) || 1;
    const push = 14;
    const lx = midCurveX + ((midCurveX - cx) / away) * push;
    const ly = midCurveY + ((midCurveY - cy) / away) * push;
    const labelLines = e.label ? wrapText(e.label, 108, 10.5) : [];
    const labelWidth = Math.max(
      ...labelLines.map((l) => measureText(l, 10.5)),
      10
    );

    return {
      e,
      d: path,
      ctrl,
      ctrl2: undefined as { x: number; y: number } | undefined,
      labelLines,
      labelWidth,
      lx,
      ly
    };
  });

  // Crop to the drawn content: boxes, curve control points, and label plates.
  const xs: number[] = [];
  const ys: number[] = [];
  nodes.forEach((state, i) => {
    const p = pos[i];
    xs.push(
      p.x - BOX_WIDTH / 2 - (state.initial ? 28 : 0),
      p.x + BOX_WIDTH / 2
    );
    ys.push(p.y - state.height / 2, p.y + state.height / 2);
  });
  curves.forEach((curve) => {
    xs.push(
      curve.lx - curve.labelWidth / 2 - 4,
      curve.lx + curve.labelWidth / 2 + 4
    );
    ys.push(
      curve.ly - curve.labelLines.length * LABEL_LINE * 0.5 - 4,
      curve.ly + curve.labelLines.length * LABEL_LINE * 0.5 + 4
    );
    xs.push(curve.ctrl.x);
    ys.push(curve.ctrl.y);
    if (curve.ctrl2) {
      xs.push(curve.ctrl2.x);
      ys.push(curve.ctrl2.y);
    }
  });
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const width = Math.max(...xs) + PAD - minX;
  const height = Math.max(...ys) + PAD - minY;

  const svg = (
    <svg
      ref={ref}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      {...svgLayout(align, width, className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {edges.map((e, i) => (
          <marker
            key={i}
            id={`state-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <g {...colorProps(e.color)}>
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                style={{ fill: 'var(--mn-color)' }}
              />
            </g>
          </marker>
        ))}
      </defs>

      {curves.map((curve, i) => (
        <motion.g
          key={`edge-${i}`}
          {...colorProps(curve.e.color)}
          {...reveal({
            from: { opacity: 0 },
            duration: 0.4,
            delay: 0.3 + i * 0.06
          })}
        >
          <path
            d={curve.d}
            fill="none"
            strokeWidth="1.5"
            strokeDasharray={curve.e.dashed ? '5 4' : undefined}
            style={{ stroke: 'var(--mn-color)' }}
            markerEnd={`url(#state-arrow-${i})`}
          />
        </motion.g>
      ))}

      {nodes.map((state, i) => {
        const p = pos[i];
        const x = p.x - BOX_WIDTH / 2;
        const y = p.y - state.height / 2;
        const textTop =
          y +
          (state.height -
            (state.lines.length * LINE_HEIGHT +
              state.subLines.length * SUB_LINE)) /
            2 +
          LINE_HEIGHT -
          3;

        return (
          <motion.g
            key={i}
            {...colorProps(state.color)}
            {...reveal({
              from: { opacity: 0, scale: 0.9 },
              duration: 0.4,
              delay: i * stagger,
              pulse: state.pulse
            })}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            {state.initial && (
              <>
                <circle
                  cx={x - 22}
                  cy={p.y}
                  r="4.5"
                  style={{ fill: 'var(--mn-color)' }}
                />
                <line
                  x1={x - 17}
                  y1={p.y}
                  x2={x - 3}
                  y2={p.y}
                  strokeWidth="1.5"
                  style={{ stroke: 'var(--mn-color)' }}
                />
              </>
            )}
            <rect
              x={x}
              y={y}
              width={BOX_WIDTH}
              height={state.height}
              rx="8"
              strokeWidth="1.5"
              style={{ fill: 'var(--ac-fill)', stroke: 'var(--mn-color)' }}
            />
            {state.final && (
              <rect
                x={x + 4}
                y={y + 4}
                width={BOX_WIDTH - 8}
                height={state.height - 8}
                rx="5"
                fill="none"
                strokeWidth="1"
                style={{ stroke: 'var(--mn-color)', strokeOpacity: 0.6 }}
              />
            )}
            <TextBlock
              lines={state.lines}
              x={p.x}
              y={textTop}
              lineHeight={LINE_HEIGHT}
              fontSize={13}
              fontWeight={500}
              className="fill-foreground"
            />
            {state.subLines.length > 0 && (
              <TextBlock
                lines={state.subLines}
                x={p.x}
                y={textTop + (state.lines.length - 1) * LINE_HEIGHT + 13}
                lineHeight={SUB_LINE}
                fontSize={10}
                className="fill-muted-foreground"
              />
            )}
          </motion.g>
        );
      })}

      {curves.map((curve, i) =>
        curve.labelLines.length > 0 ? (
          <motion.g
            key={`edge-label-${i}`}
            {...reveal({
              from: { opacity: 0 },
              duration: 0.4,
              delay: 0.4 + i * 0.06
            })}
          >
            {/* Opaque plate so neither the curve nor a box edge underneath
                runs through the label. */}
            <rect
              x={curve.lx - curve.labelWidth / 2 - 4}
              y={curve.ly - curve.labelLines.length * LABEL_LINE * 0.5 - 4}
              width={curve.labelWidth + 8}
              height={curve.labelLines.length * LABEL_LINE + 7}
              rx="3"
              style={{ fill: 'var(--color-background)' }}
            />
            <TextBlock
              lines={curve.labelLines}
              x={curve.lx}
              y={
                curve.ly -
                ((curve.labelLines.length - 1) * LABEL_LINE) / 2 +
                3.5
              }
              lineHeight={LABEL_LINE}
              fontSize={10.5}
              className="fill-muted-foreground"
            />
          </motion.g>
        ) : null
      )}
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
