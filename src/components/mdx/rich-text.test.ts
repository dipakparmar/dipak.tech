import { describe, test, expect } from 'bun:test';
import { parseInline, parseRichText } from './rich-text';

describe('parseInline', () => {
  test('plain text is one unstyled segment', () => {
    expect(parseInline('hello')).toEqual([{ text: 'hello', bold: false, italic: false, underline: false }]);
  });

  test('html tags style their contents', () => {
    expect(parseInline('a<b>B</b>c')).toEqual([
      { text: 'a', bold: false, italic: false, underline: false },
      { text: 'B', bold: true, italic: false, underline: false },
      { text: 'c', bold: false, italic: false, underline: false }
    ]);
  });

  test('markdown bold and italic', () => {
    expect(parseInline('**x** *y*')).toEqual([
      { text: 'x', bold: true, italic: false, underline: false },
      { text: ' ', bold: false, italic: false, underline: false },
      { text: 'y', bold: false, italic: true, underline: false }
    ]);
  });

  test('nesting combines styles', () => {
    expect(parseInline('<b><u>hi</u></b>')).toEqual([{ text: 'hi', bold: true, italic: false, underline: true }]);
  });

  test('strong/em aliases', () => {
    const [seg] = parseInline('<strong>x</strong>');
    expect(seg).toMatchObject({ bold: true });
    expect(parseInline('<em>y</em>')[0]).toMatchObject({ italic: true });
  });
});

describe('parseRichText', () => {
  test('splits on <br> variants', () => {
    expect(parseRichText('a<br>b<br/>c<br />d').length).toBe(4);
  });
});
