import type { FabricObject, StaticCanvas } from 'fabric';

/** One snapshot of an object's transform at a point in time (seconds). */
export type Keyframe = {
  t: number;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
};

export type Pose = Omit<Keyframe, 't'>;

/** Objects carry their keyframes as a custom prop (serialized via SERIALIZED_PROPS). */
export type Keyframed = FabricObject & { keyframes?: Keyframe[] };

/** A canvas we can read/animate objects on (live Canvas or offscreen StaticCanvas). */
type ObjectCanvas = Pick<StaticCanvas, 'getObjects'>;

export function readPose(obj: FabricObject): Pose {
  return {
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    opacity: obj.opacity ?? 1
  };
}

function stripTime(kf: Keyframe): Pose {
  const { t: _t, ...pose } = kf;
  return pose;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Cubic ease-in-out - the one easing every entrance/emphasis motion wants. */
// ponytail: single global easing; add per-keyframe easing only if a design needs it.
function easeInOut(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

export function getKeyframes(obj: FabricObject): Keyframe[] | undefined {
  const kf = (obj as Keyframed).keyframes;
  return Array.isArray(kf) && kf.length ? kf : undefined;
}

/** Interpolate a keyframe list at time `t`. Holds first/last outside the range. */
export function sampleAt(keyframes: Keyframe[], t: number): Pose {
  const kfs = keyframes; // stored sorted by time
  if (t <= kfs[0].t) return stripTime(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return stripTime(last);
  let i = 0;
  while (i < kfs.length - 1 && kfs[i + 1].t <= t) i++;
  const a = kfs[i];
  const b = kfs[i + 1];
  const k = easeInOut((t - a.t) / (b.t - a.t || 1));
  return {
    left: lerp(a.left, b.left, k),
    top: lerp(a.top, b.top, k),
    scaleX: lerp(a.scaleX, b.scaleX, k),
    scaleY: lerp(a.scaleY, b.scaleY, k),
    angle: lerp(a.angle, b.angle, k),
    opacity: lerp(a.opacity, b.opacity, k)
  };
}

/** Total animation length = latest keyframe across all objects (seconds). */
export function animationDuration(canvas: ObjectCanvas): number {
  let max = 0;
  for (const obj of canvas.getObjects()) {
    const kfs = getKeyframes(obj);
    if (kfs) max = Math.max(max, kfs[kfs.length - 1].t);
  }
  return max;
}

export function hasAnimation(canvas: ObjectCanvas): boolean {
  return canvas.getObjects().some((obj) => getKeyframes(obj));
}

/** Move every keyframed object to its interpolated pose at time `t`. */
export function applyAnimationAtTime(canvas: ObjectCanvas, t: number): void {
  for (const obj of canvas.getObjects()) {
    const kfs = getKeyframes(obj);
    if (!kfs) continue;
    obj.set(sampleAt(kfs, t));
    obj.setCoords();
  }
}

/** Insert/replace a keyframe; keyframes within EPS of `t` are overwritten. */
const EPS = 0.03;
export function upsertKeyframe(obj: FabricObject, kf: Keyframe): Keyframe[] {
  const next = (getKeyframes(obj) ?? []).filter(
    (k) => Math.abs(k.t - kf.t) > EPS
  );
  next.push(kf);
  next.sort((a, b) => a.t - b.t);
  (obj as Keyframed).keyframes = next;
  return next;
}

export function removeKeyframeAt(obj: FabricObject, t: number): Keyframe[] {
  const next = (getKeyframes(obj) ?? []).filter((k) => Math.abs(k.t - t) > EPS);
  (obj as Keyframed).keyframes =
    next.length > 0 ? next : (undefined as unknown as Keyframe[]);
  if (!next.length) delete (obj as Keyframed).keyframes;
  return next;
}

/**
 * Quick presets that write two keyframes (entrance from an offset -> the
 * object's current resting pose). Saves the user hand-placing every keyframe.
 */
export type AnimationPreset =
  | 'fade'
  | 'slide-up'
  | 'slide-left'
  | 'pop'
  | 'rise';

export function presetKeyframes(
  obj: FabricObject,
  preset: AnimationPreset,
  duration = 0.6
): Keyframe[] {
  const rest = readPose(obj);
  const offset = Math.max(60, (obj.height ?? 200) * (obj.scaleY ?? 1) * 0.5);
  const start: Pose = { ...rest };
  switch (preset) {
    case 'fade':
      start.opacity = 0;
      break;
    case 'slide-up':
      start.opacity = 0;
      start.top = rest.top + offset;
      break;
    case 'slide-left':
      start.opacity = 0;
      start.left = rest.left + offset;
      break;
    case 'pop':
      start.opacity = 0;
      start.scaleX = rest.scaleX * 0.4;
      start.scaleY = rest.scaleY * 0.4;
      break;
    case 'rise':
      start.opacity = 0;
      start.top = rest.top + offset * 0.5;
      start.scaleX = rest.scaleX * 0.9;
      start.scaleY = rest.scaleY * 0.9;
      break;
  }
  const kfs: Keyframe[] = [
    { t: 0, ...start },
    { t: duration, ...rest }
  ];
  (obj as Keyframed).keyframes = kfs;
  return kfs;
}
