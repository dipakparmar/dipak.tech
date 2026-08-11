import { describe, test, expect } from 'bun:test';
import {
  colorProps,
  isPaletteColor,
  measureText,
  revealTarget,
  svgLayout,
  wrapText
} from './diagram-kit';

describe('measureText', () => {
  test('scales with font size', () => {
    expect(measureText('hello', 20)).toBeCloseTo(measureText('hello', 10) * 2);
  });

  test('ignores inline markup', () => {
    expect(measureText('**bold**', 12)).toBeCloseTo(measureText('bold', 12));
    expect(measureText('<b>bold</b>', 12)).toBeCloseTo(measureText('bold', 12));
  });

  test('wide characters measure wider than narrow ones', () => {
    expect(measureText('mmm', 12)).toBeGreaterThan(measureText('iii', 12));
  });
});

describe('wrapText', () => {
  test('short text stays on one line', () => {
    expect(wrapText('hello', 200, 12)).toEqual(['hello']);
  });

  test('breaks on spaces to fit the width', () => {
    const lines = wrapText('one two three four five six', 60, 12);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 12)).toBeLessThanOrEqual(60);
    }
  });

  test('honors explicit <br>', () => {
    expect(wrapText('a<br>b', 500, 12)).toEqual(['a', 'b']);
  });

  test('hard-splits a single unbreakable token', () => {
    const lines = wrapText('a'.repeat(80), 60, 12);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('a'.repeat(80));
  });

  test('keeps emphasis balanced across a break', () => {
    const lines = wrapText('**bold words wrapping here**', 50, 12);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      const open = (line.match(/<b>/g) ?? []).length;
      const close = (line.match(/<\/b>/g) ?? []).length;
      expect(open).toBe(close);
    }
    expect(lines.every((l) => l.startsWith('<b>'))).toBe(true);
  });

  test('lone asterisk stays literal', () => {
    expect(wrapText('2 * 3', 500, 12)).toEqual(['2 * 3']);
  });
});

describe('svgLayout', () => {
  test('centers by default and pins the natural width', () => {
    const { className, style } = svgLayout(undefined, 420);
    expect(className).toContain('mx-auto');
    expect(style.maxWidth).toBe(420);
  });

  test('full stretches to the column', () => {
    expect(svgLayout('full', 420).style.maxWidth).toBe('100%');
  });

  test('left and right push to one side', () => {
    expect(svgLayout('left', 420).className).toContain('mr-auto');
    expect(svgLayout('right', 420).className).toContain('ml-auto');
  });
});

describe('colorProps', () => {
  test('palette keys route through the CSS attribute', () => {
    expect(colorProps('danger')).toEqual({ 'data-color': 'danger' });
    expect(colorProps('chart-3')).toEqual({ 'data-color': 'chart-3' });
  });

  test('a raw CSS color is set inline instead', () => {
    const { style, ...rest } = colorProps('#e76f51');
    expect(rest).toEqual({});
    expect(style).toMatchObject({ '--mn-color': '#e76f51' });
    expect(String(style?.['--mn-color' as never])).toBe('#e76f51');
  });

  test('var() and oklch() count as raw values, not keys', () => {
    expect(colorProps('var(--brand)').style).toBeDefined();
    expect(colorProps('oklch(60% 0.2 20)').style).toBeDefined();
    expect(isPaletteColor('var(--brand)')).toBe(false);
    expect(isPaletteColor('tip')).toBe(true);
  });

  test('extra style survives either route', () => {
    expect(colorProps('tip', { opacity: 0.5 })).toEqual({
      'data-color': 'tip',
      style: { opacity: 0.5 }
    });
    expect(colorProps('#fff', { opacity: 0.5 }).style).toMatchObject({
      opacity: 0.5,
      '--mn-color': '#fff'
    });
  });

  test('no color at all sets nothing', () => {
    expect(colorProps(undefined)).toEqual({});
  });
});

describe('revealTarget', () => {
  test('opacity, scale and pathLength end at 1', () => {
    expect(revealTarget({ opacity: 0 })).toEqual({ opacity: 1 });
    expect(revealTarget({ scale: 0.8 })).toEqual({ scale: 1 });
    // Regression: ending pathLength at 0 leaves stroke-dasharray "0px 1px",
    // which silently hides every connector while the boxes still render.
    expect(revealTarget({ pathLength: 0 })).toEqual({ pathLength: 1 });
  });

  test('offsets end at 0', () => {
    expect(revealTarget({ opacity: 0, y: 4 })).toEqual({ opacity: 1, y: 0 });
    expect(revealTarget({ x: -4 })).toEqual({ x: 0 });
  });
});
