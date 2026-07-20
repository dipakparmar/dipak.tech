import { expect, test } from 'bun:test';

import {
  DEFAULT_TEXT_BRUSH,
  glyphFill,
  layoutTextAlongPath,
  smoothPoints
} from '@/lib/studio/text-brush';

const measure = () => 10;

test('repeats the text along a straight stroke and stops at the end', () => {
  const glyphs = layoutTextAlongPath(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 }
    ],
    'ab',
    measure
  );
  expect(glyphs.map((g) => g.char).join('')).toBe('ababababab');
  expect(glyphs[1].x).toBe(10);
  expect(glyphs.every((g) => g.angle === 0)).toBe(true);
});

test('rotates glyphs to the local tangent across corners', () => {
  const glyphs = layoutTextAlongPath(
    [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 40 }
    ],
    'x',
    measure
  );
  expect(glyphs[0].angle).toBe(0);
  expect(glyphs[glyphs.length - 1].angle).toBe(90);
  expect(glyphs.length).toBe(6);
});

/** Total absolute turning along a path - the thing that jitters glyph angles. */
function turning(points: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 2; i < points.length; i++) {
    const a = Math.atan2(
      points[i - 1].y - points[i - 2].y,
      points[i - 1].x - points[i - 2].x
    );
    const b = Math.atan2(
      points[i].y - points[i - 1].y,
      points[i].x - points[i - 1].x
    );
    sum += Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
  }
  return sum;
}

test('smoothing takes the shake out of a wobbly line, keeping the ends', () => {
  // A straight run with a 3px shake on every other point.
  const jittery = Array.from({ length: 40 }, (_, i) => ({
    x: i * 5,
    y: i % 2 ? 3 : -3
  }));
  const raw = smoothPoints(jittery, 0);
  const smooth = smoothPoints(jittery, 1);
  expect(raw).toBe(jittery);
  expect(smooth[0]).toEqual(jittery[0]);
  expect(smooth[smooth.length - 1]).toEqual(jittery[jittery.length - 1]);
  expect(turning(smooth)).toBeLessThan(turning(jittery) / 10);
});

test('smoothing keeps a real curve, it does not flatten it', () => {
  const arc = Array.from({ length: 30 }, (_, i) => {
    const t = (i / 29) * Math.PI;
    return { x: 100 * (1 - Math.cos(t)), y: 100 * Math.sin(t) };
  });
  const smooth = smoothPoints(arc, 1);
  const height = (pts: { y: number }[]) => Math.max(...pts.map((p) => p.y));
  expect(height(smooth)).toBeGreaterThan(height(arc) * 0.9);
});

test('colour modes: flat, blended end to end, and around the hues', () => {
  const solid = { ...DEFAULT_TEXT_BRUSH, colorMode: 'solid' as const };
  expect(glyphFill(solid, 3, 10)).toBe(solid.color);

  const gradient = {
    ...DEFAULT_TEXT_BRUSH,
    colorMode: 'gradient' as const,
    color: '#000000',
    color2: '#ffffff'
  };
  expect(glyphFill(gradient, 0, 3)).toBe('rgb(0,0,0)');
  expect(glyphFill(gradient, 1, 3)).toBe('rgb(128,128,128)');
  expect(glyphFill(gradient, 2, 3)).toBe('rgb(255,255,255)');

  const rainbow = { ...DEFAULT_TEXT_BRUSH, colorMode: 'rainbow' as const };
  expect(glyphFill(rainbow, 0, 5)).toBe('hsl(0 90% 55%)');
  expect(glyphFill(rainbow, 4, 5)).toBe('hsl(360 90% 55%)');
});

test('empty text or a single point yields nothing', () => {
  expect(layoutTextAlongPath([{ x: 0, y: 0 }], 'a', measure)).toEqual([]);
  expect(
    layoutTextAlongPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      '',
      measure
    )
  ).toEqual([]);
});
