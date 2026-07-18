import { expect, test } from 'bun:test';

import {
  animationDuration,
  presetKeyframes,
  sampleAt,
  upsertKeyframe,
  type Keyframe
} from '@/lib/studio/animation';

const pose = (over: Partial<Keyframe>): Keyframe => ({
  t: 0,
  left: 0,
  top: 0,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  opacity: 1,
  ...over
});

test('sampleAt holds first/last outside the range', () => {
  const kfs = [pose({ t: 1, left: 10 }), pose({ t: 2, left: 20 })];
  expect(sampleAt(kfs, 0).left).toBe(10);
  expect(sampleAt(kfs, 5).left).toBe(20);
});

test('sampleAt interpolates monotonically between keyframes', () => {
  const kfs = [pose({ t: 0, opacity: 0 }), pose({ t: 1, opacity: 1 })];
  const mid = sampleAt(kfs, 0.5).opacity;
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(1);
  // Easing is symmetric: midpoint lands at exactly 0.5.
  expect(mid).toBeCloseTo(0.5, 5);
});

test('upsertKeyframe replaces near-equal times and keeps sorted order', () => {
  const obj = {} as Parameters<typeof upsertKeyframe>[0];
  upsertKeyframe(obj, pose({ t: 1, left: 5 }));
  upsertKeyframe(obj, pose({ t: 0, left: 0 }));
  const kfs = upsertKeyframe(obj, pose({ t: 1.0, left: 9 })); // overwrites t=1
  expect(kfs.map((k) => k.t)).toEqual([0, 1]);
  expect(kfs[1].left).toBe(9);
});

test('presetKeyframes ends at the resting pose', () => {
  const obj = {
    left: 100,
    top: 50,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    opacity: 1
  };
  const kfs = presetKeyframes(obj as never, 'slide-up', 0.6);
  expect(kfs[0].opacity).toBe(0);
  expect(kfs[kfs.length - 1].left).toBe(100);
  expect(kfs[kfs.length - 1].top).toBe(50);
  expect(kfs[kfs.length - 1].opacity).toBe(1);
});

test('animationDuration is the latest keyframe across objects', () => {
  const canvas = {
    getObjects: () => [
      { keyframes: [pose({ t: 0 }), pose({ t: 1.5 })] },
      { keyframes: [pose({ t: 0 }), pose({ t: 3 })] },
      {} // no keyframes
    ]
  };
  expect(animationDuration(canvas as never)).toBe(3);
});
