import type { ReactNode } from 'react';

// SVG <text> can't render HTML, so inline formatting in diagram labels has to
// become styled <tspan> runs. Supported syntax (HTML tags and a markdown
// subset, freely nestable):
//   <b>/<strong> or **bold**     -> font-weight 600
//   <i>/<em> or *italic*         -> font-style italic
//   <u>...</u>                   -> underline
//   <br> / <br/>                 -> line break (richText only)
// A * or ** with no matching closer on the same line is left as literal text,
// so plain asterisks (multiplication, footnote marks) render as-is.

export interface RichSeg {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const TAG = /^<(\/?)(b|strong|i|em|u)>/i;

/** Parse one line (no <br>) into styled segments. Pure — exported for tests. */
export function parseInline(line: string): RichSeg[] {
  const segs: RichSeg[] = [];
  let bTag = 0,
    iTag = 0,
    uTag = 0;
  let bMd = false,
    iMd = false;
  let buf = '';

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, bold: bTag > 0 || bMd, italic: iTag > 0 || iMd, underline: uTag > 0 });
    buf = '';
  };

  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    const m = rest.match(TAG);
    if (m) {
      flush();
      const delta = m[1] ? -1 : 1;
      const tag = m[2].toLowerCase();
      if (tag === 'b' || tag === 'strong') bTag = Math.max(0, bTag + delta);
      else if (tag === 'i' || tag === 'em') iTag = Math.max(0, iTag + delta);
      else uTag = Math.max(0, uTag + delta);
      i += m[0].length;
      continue;
    }
    // Only treat * / ** as a delimiter when it actually pairs: closing an open
    // run, or opening one that has a matching closer later on the line. A lone
    // asterisk (multiplication, "*est.") stays literal instead of swallowing the
    // rest of the line.
    if (rest.startsWith('**')) {
      if (bMd || rest.slice(2).includes('**')) {
        flush();
        bMd = !bMd;
        i += 2;
        continue;
      }
    } else if (rest[0] === '*') {
      if (iMd || rest.slice(1).includes('*')) {
        flush();
        iMd = !iMd;
        i += 1;
        continue;
      }
    }
    buf += line[i];
    i += 1;
  }
  flush();
  return segs.length ? segs : [{ text: '', bold: false, italic: false, underline: false }];
}

/** Split a string into lines on <br>, then into styled segments per line. */
export function parseRichText(input: string): RichSeg[][] {
  return input.split(/<br\s*\/?>/i).map(parseInline);
}

function styleProps(seg: RichSeg) {
  return {
    ...(seg.bold ? { fontWeight: 600 } : {}),
    ...(seg.italic ? { fontStyle: 'italic' as const } : {}),
    ...(seg.underline ? { textDecoration: 'underline' as const } : {})
  };
}

/** Inline-only: renders styled tspans, treating <br> as a space. Use inside an
 *  existing <tspan> structure that already handles line layout (notes, arrows). */
export function richInline(input: string): ReactNode {
  return parseInline(input.replace(/<br\s*\/?>/gi, ' ')).map((seg, si) => (
    <tspan key={si} {...styleProps(seg)}>
      {seg.text}
    </tspan>
  ));
}

/** HTML context (not SVG): renders styled <strong>/<em>/<u> spans and real
 *  <br/> line breaks. Use for the figcaption, which is plain HTML. */
export function richHtml(input: string): ReactNode {
  return parseRichText(input).flatMap((segs, li) => {
    const tail = segs.map((seg, si) => {
      const inner = seg.text;
      let node: ReactNode = inner;
      if (seg.underline) node = <u key="u">{node}</u>;
      if (seg.italic) node = <em key="e">{node}</em>;
      if (seg.bold) node = <strong key="b">{node}</strong>;
      return <span key={`${li}-${si}`}>{node}</span>;
    });
    return li === 0 ? tail : [<br key={`br-${li}`} />, ...tail];
  });
}

/** Full: handles <br> by resetting x and stepping dy. Use for standalone
 *  single-string fields (titles, node labels, captions). */
export function richText(input: string, x: number, lineHeight = 12): ReactNode {
  const out: ReactNode[] = [];
  parseRichText(input).forEach((segs, li) => {
    segs.forEach((seg, si) => {
      const lineStart = li > 0 && si === 0 ? { x, dy: lineHeight } : {};
      out.push(
        <tspan key={`${li}-${si}`} {...lineStart} {...styleProps(seg)}>
          {seg.text}
        </tspan>
      );
    });
  });
  return out;
}
