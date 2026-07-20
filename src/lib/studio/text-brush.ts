import {
  BaseBrush,
  type Canvas,
  Color,
  FabricText,
  Group,
  Point,
  type TBrushEventData
} from 'fabric';

export type Glyph = { char: string; x: number; y: number; angle: number };

export type TextBrushColorMode = 'solid' | 'gradient' | 'rainbow';

/** The tweakable part of a stroke - shared by the brush and the edit panel. */
export type TextBrushSettings = {
  text: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  /** Extra px between glyphs. */
  spacing: number;
  /** 0 = raw pointer path, 1 = heavily smoothed. */
  smoothing: number;
  colorMode: TextBrushColorMode;
  color: string;
  /** Gradient end colour; ignored in the other modes. */
  color2: string;
};

/** Everything needed to re-render a stamped stroke after the fact. */
export type TextBrushStroke = TextBrushSettings & {
  /** Stable across re-stamps, so an edit always finds the live group. */
  id: string;
  points: { x: number; y: number }[];
  /** Group position straight after building - the anchor edits are relative to. */
  baseLeft: number;
  baseTop: number;
};

export type TextBrushGroup = Group & { textBrush: TextBrushStroke };

export const DEFAULT_TEXT_BRUSH: TextBrushSettings = {
  text: 'make it yours ',
  fontFamily: 'sans-serif',
  fontWeight: '700',
  fontSize: 28,
  spacing: 1,
  smoothing: 0.5,
  colorMode: 'solid',
  color: '#FFE066',
  color2: '#38BDF8'
};

export function isTextBrushGroup(obj: unknown): obj is TextBrushGroup {
  return obj instanceof Group && !!(obj as TextBrushGroup).textBrush;
}

/** Longest stroke we stamp. Each glyph becomes a Fabric object on commit. */
// ponytail: hard cap instead of merging glyphs into one Path; raise it (or
// render the stroke to an image) only if long strokes actually feel slow.
const MAX_GLYPHS = 500;

type Pt = { x: number; y: number };

/** Cumulative arc length at each vertex; last entry is the total length. */
function arcLengths(points: Pt[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(
      cum[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    );
  }
  return cum;
}

/** Position at arc length `s`, clamped to the ends. */
function pointAtLength(points: Pt[], cum: number[], s: number): Pt {
  const total = cum[cum.length - 1];
  if (s <= 0) return points[0];
  if (s >= total) return points[points.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const span = cum[i] - cum[i - 1];
  const t = span > 0 ? (s - cum[i - 1]) / span : 0;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
  };
}

/**
 * Lay characters out along a path: each glyph sits at its own arc-length
 * position, rotated to the chord it spans, so the text reads as a brush stroke.
 * `text` repeats until the stroke runs out.
 *
 * The angle comes from the chord a glyph spans, not the local segment: a
 * segment tangent flips with every wobble in the pointer path.
 */
export function layoutTextAlongPath(
  points: Pt[],
  text: string,
  measure: (char: string) => number,
  spacing = 0
): Glyph[] {
  const chars = [...text];
  if (points.length < 2 || !chars.length) return [];
  const cum = arcLengths(points);
  const total = cum[cum.length - 1];
  if (total <= 0) return [];

  const glyphs: Glyph[] = [];
  let s = 0;
  let index = 0;
  while (s < total && glyphs.length < MAX_GLYPHS) {
    const char = chars[index % chars.length];
    const width = measure(char);
    const from = pointAtLength(points, cum, s);
    const to = pointAtLength(
      points,
      cum,
      Math.min(s + Math.max(width, 1), total)
    );
    glyphs.push({
      char,
      x: from.x,
      y: from.y,
      angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
    });
    index += 1;
    // Guard: a tiny glyph plus negative spacing must still make progress.
    s += Math.max(width + spacing, 0.5);
  }
  return glyphs;
}

/** Catmull-Rom through the control points, resampled every `step` px. */
function spline(points: Pt[], step: number): Pt[] {
  if (points.length < 3) return points;
  const p = [points[0], ...points, points[points.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step)
    );
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (p2.x - p0.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (p2.y - p0.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Drop vertices closer together than `minDist`, always keeping the ends. */
function thin(points: Pt[], minDist: number): Pt[] {
  const out = [points[0]];
  for (const point of points.slice(1, -1)) {
    const last = out[out.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) >= minDist)
      out.push(point);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Stabilise a hand-drawn path: thin the control points (more smoothing = wider
 * spacing, so shake is dropped rather than blurred), then spline through what
 * is left. Keeps the curve's shape, unlike neighbour averaging.
 */
export function smoothPoints(points: Pt[], smoothing: number): Pt[] {
  if (points.length < 3 || smoothing <= 0) return points;
  return spline(thin(points, 2 + smoothing * 40), 3);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Per-glyph fill: flat, blended along the stroke, or straight through the hues. */
export function glyphFill(
  settings: TextBrushSettings,
  index: number,
  total: number
): string {
  const t = total > 1 ? index / (total - 1) : 0;
  if (settings.colorMode === 'rainbow')
    return `hsl(${Math.round(t * 360)} 90% 55%)`;
  if (settings.colorMode !== 'gradient') return settings.color;
  const [r1, g1, b1] = new Color(settings.color).getSource();
  const [r2, g2, b2] = new Color(settings.color2).getSource();
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
}

const measureCanvas = () => document.createElement('canvas').getContext('2d');

/** Character width measurer for a given font, memoised per call site. */
export function charMeasurer(font: string): (char: string) => number {
  const cache = new Map<string, number>();
  const ctx = measureCanvas();
  return (char) => {
    const hit = cache.get(char);
    if (hit !== undefined) return hit;
    if (!ctx) return 12;
    ctx.font = font;
    const width = ctx.measureText(char).width;
    cache.set(char, width);
    return width;
  };
}

export const strokeFont = (settings: TextBrushSettings) =>
  `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}`;

export function strokeGlyphs(
  stroke: Pick<TextBrushStroke, 'points'> & TextBrushSettings,
  measure = charMeasurer(strokeFont(stroke))
): Glyph[] {
  return layoutTextAlongPath(
    smoothPoints(stroke.points, stroke.smoothing),
    stroke.text,
    measure,
    stroke.spacing
  );
}

/** Build the selectable group of glyphs for a stroke, at its original coords. */
export function buildTextBrushGroup(
  stroke: TextBrushStroke
): TextBrushGroup | null {
  const glyphs = strokeGlyphs(stroke);
  if (!glyphs.length) return null;
  const group = new Group(
    glyphs.map(
      (glyph, index) =>
        new FabricText(glyph.char, {
          left: glyph.x,
          top: glyph.y,
          originX: 'left',
          originY: 'center',
          angle: glyph.angle,
          fontFamily: stroke.fontFamily,
          fontWeight: stroke.fontWeight,
          fontSize: stroke.fontSize,
          fill: glyphFill(stroke, index, glyphs.length)
        })
    )
  ) as TextBrushGroup;
  group.set({
    name: 'Text brush',
    textBrush: { ...stroke, baseLeft: group.left, baseTop: group.top }
  });
  return group;
}

/**
 * Re-stamp an existing stroke with new settings. The rebuild happens in the
 * original path coordinates, so we carry over how far the user has since moved
 * / scaled / rotated the group.
 */
export function restyleTextBrushGroup(
  group: TextBrushGroup,
  patch: Partial<TextBrushStroke>
): TextBrushGroup | null {
  const stroke = group.textBrush;
  const next = buildTextBrushGroup({ ...stroke, ...patch });
  if (!next) return null;
  next.set({
    left: next.textBrush.baseLeft + (group.left - stroke.baseLeft),
    top: next.textBrush.baseTop + (group.top - stroke.baseTop),
    scaleX: group.scaleX,
    scaleY: group.scaleY,
    angle: group.angle,
    opacity: group.opacity,
    visible: group.visible
  });
  // Carry the studio's own props - a re-stamp must not drop the stroke's
  // animation, its name, or its locked/hidden state.
  const carried = group as unknown as Record<string, unknown>;
  for (const prop of ['name', 'locked', 'selectable', 'evented', 'keyframes'])
    if (carried[prop] !== undefined) next.set(prop, carried[prop]);
  return next;
}

let strokeSeq = 0;

/** Free-drawing brush that stamps repeating text along the drawn stroke. */
export class TextBrush extends BaseBrush {
  settings: TextBrushSettings = { ...DEFAULT_TEXT_BRUSH };

  private points: Point[] = [];
  private measure = charMeasurer('');
  private strokeId = '';

  constructor(canvas: Canvas) {
    super(canvas);
  }

  private stroke(): TextBrushStroke {
    return {
      ...this.settings,
      id: this.strokeId,
      points: this.points,
      baseLeft: 0,
      baseTop: 0
    };
  }

  onMouseDown(pointer: Point, { e }: TBrushEventData): void {
    if ('button' in e && e.button !== 0) return;
    this.strokeId = `tb-${Date.now().toString(36)}-${(strokeSeq += 1)}`;
    this.measure = charMeasurer(strokeFont(this.settings));
    this.points = [pointer];
  }

  onMouseMove(pointer: Point): void {
    if (!this.points.length) return;
    const last = this.points[this.points.length - 1];
    // Decimate: sub-pixel segments only add jitter for the tangent to amplify.
    if (Math.hypot(pointer.x - last.x, pointer.y - last.y) < 3) return;
    this.points.push(pointer);
    this._render();
  }

  onMouseUp(): boolean {
    const stroke = this.stroke();
    this.points = [];
    this.canvas.clearContext(this.canvas.contextTop);
    const group = buildTextBrushGroup(stroke);
    if (group) this.canvas.add(group);
    this.canvas.requestRenderAll();
    return false;
  }

  _render(): void {
    const ctx = this.canvas.contextTop;
    this.canvas.clearContext(ctx);
    this._saveAndTransform(ctx);
    ctx.font = strokeFont(this.settings);
    ctx.textBaseline = 'middle';
    const glyphs = strokeGlyphs(this.stroke(), this.measure);
    glyphs.forEach((glyph, index) => {
      ctx.save();
      ctx.fillStyle = glyphFill(this.settings, index, glyphs.length);
      ctx.translate(glyph.x, glyph.y);
      ctx.rotate((glyph.angle * Math.PI) / 180);
      ctx.fillText(glyph.char, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }
}
