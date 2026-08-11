'use client';

import {
  BinocularsIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { richHtml } from './rich-text';

/** Which corner of the diagram the buttons sit in. `false` hides them. */
export type DiagramActionsCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type DiagramActionsOption = false | DiagramActionsCorner;

const CORNER_CLASS: Record<DiagramActionsCorner, string> = {
  'top-left': 'top-1 left-1',
  'top-right': 'top-1 right-1',
  'bottom-left': 'bottom-1 left-1',
  'bottom-right': 'bottom-1 right-1'
};

/** Fonts inlined once per page, keyed by family. */
const fontCache = new Map<string, string>();

const SVG_NS = 'http://www.w3.org/2000/svg';

// Presentation the export has to carry over. The diagrams style themselves
// through CSS custom properties and Tailwind classes, neither of which survive
// leaving the page, so every painted value is resolved and written inline.
// `opacity` and `stroke-dasharray` are deliberately absent: those are what the
// entrance animation drives, and copying their live values bakes in whatever
// half-finished frame the diagram happened to be on. An authored dash is an
// attribute, so it survives the clone on its own.
const PAINT_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'text-decoration',
  'marker-end',
  'marker-start'
];

/**
 * The page's webfont as an inline `@font-face`, so exported text keeps the
 * site's typeface.
 *
 * An SVG rasterized through an `<img>` is its own document: it cannot reach
 * the page's stylesheets or fetch anything, so a font referenced by URL is
 * simply dropped and the text falls back to whatever the platform has. The
 * bytes have to travel inside the file.
 */
async function inlineFontCss(families: Set<string>): Promise<string> {
  const wanted = [...families].filter((f) => !fontCache.has(f));
  if (!wanted.length) {
    return [...families]
      .map((f) => fontCache.get(f))
      .filter(Boolean)
      .join('');
  }

  // A webfont is usually split across several @font-face rules, one per
  // unicode-range. Every one of them has to be carried over: keeping only the
  // first embeds whichever subset happens to be declared first — frequently
  // Cyrillic or Greek — and the Latin text then quietly falls back anyway.
  const collected = new Map<string, string[]>();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // Cross-origin sheet; nothing readable in it.
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style
        .getPropertyValue('font-family')
        .replace(/["']/g, '')
        .trim();
      if (!wanted.includes(family)) continue;

      const src = rule.style.getPropertyValue('src');
      const raw = src.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!raw) continue;
      try {
        // A font URL in a stylesheet is relative to that stylesheet, not to
        // the page. Resolving it against the document instead 404s, and the
        // error page then base64s into an unusable "font" that silently falls
        // back — which looks exactly like no embedding at all.
        const url = new URL(raw, sheet.href ?? document.baseURI);
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 512) continue;
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const encoded = btoa(binary);
        const weight = rule.style.getPropertyValue('font-weight') || 'normal';
        const style = rule.style.getPropertyValue('font-style') || 'normal';
        const range = rule.style.getPropertyValue('unicode-range');
        collected.set(family, [
          ...(collected.get(family) ?? []),
          `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};` +
            (range ? `unicode-range:${range};` : '') +
            `src:url(data:font/woff2;base64,${encoded}) format('woff2');}`
        ]);
      } catch {
        // A font that won't load is not worth failing the export over.
      }
    }
  }

  for (const [family, parts] of collected) {
    fontCache.set(family, parts.join(''));
  }

  return [...families]
    .map((f) => fontCache.get(f))
    .filter(Boolean)
    .join('');
}

/**
 * An attribution line for someone reusing the diagram elsewhere.
 *
 * Everything is read from the page rather than hardcoded: the author from the
 * `author` meta tag, the containing post from `og:title`, and the address from
 * the canonical link, so a reader who moves the file still has a working way
 * back to the source.
 */
function buildCitation(label: string, anchorId: string): string {
  const meta = (selector: string) =>
    document.querySelector<HTMLMetaElement>(selector)?.content?.trim();

  const author = meta('meta[name="author"]') ?? location.hostname;
  const post = meta('meta[property="og:title"]') ?? document.title;
  const canonical =
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ??
    `${location.origin}${location.pathname}`;
  const url = `${canonical}#${anchorId}`;
  // From the canonical URL, not location: on a preview deploy or localhost the
  // two disagree, and the citation would name a host the link doesn't go to.
  const site = new URL(canonical).hostname;
  const accessed = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `${author}. "${label}" [diagram]. In "${post}". ${site}, ${url}. Accessed ${accessed}.`;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'diagram'
  );
}

/**
 * Put a cloned diagram into its finished state.
 *
 * A copy taken while the entrance is still running freezes it mid-flight:
 * elements stuck at opacity 0, connectors half drawn. Motion writes those to
 * inline styles, so clearing them reverts to the authored, complete rendering
 * no matter when the copy was taken.
 */
function freezeMotion(root: SVGSVGElement) {
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    if (!(el instanceof SVGElement) && !(el instanceof HTMLElement)) continue;
    el.style.removeProperty('opacity');
    el.style.removeProperty('transform');
    el.style.removeProperty('stroke-dasharray');
    el.style.removeProperty('stroke-dashoffset');
    // On SVG, motion drives these as attributes rather than inline styles, so
    // clearing the style alone leaves a half-revealed copy behind.
    el.removeAttribute('opacity');
    // A dash that comes with pathLength is the draw-on animation mid-flight.
    // An authored dash has no pathLength beside it and must survive.
    if (el.hasAttribute('pathLength')) {
      el.removeAttribute('pathLength');
      el.removeAttribute('stroke-dasharray');
      el.removeAttribute('stroke-dashoffset');
    }
  }
}

/** A standalone copy of the diagram with all computed paint inlined. */
function inlineStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = [svg, ...svg.querySelectorAll('*')];
  const target = [clone, ...clone.querySelectorAll('*')];

  source.forEach((node, i) => {
    const el = target[i] as SVGElement | undefined;
    if (!el || !(node instanceof Element)) return;
    const computed = getComputedStyle(node);
    for (const prop of PAINT_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal') {
        el.style.setProperty(prop, value);
      }
    }
    el.removeAttribute('class');
  });

  clone.style.removeProperty('max-width');
  clone.removeAttribute('class');
  freezeMotion(clone);
  return clone;
}

function withBackground(clone: SVGSVGElement, svg: SVGSVGElement) {
  const vb = svg.viewBox.baseVal;
  const background = getComputedStyle(document.body).backgroundColor;
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(vb.x));
  rect.setAttribute('y', String(vb.y));
  rect.setAttribute('width', String(vb.width));
  rect.setAttribute('height', String(vb.height));
  rect.setAttribute('fill', background || '#ffffff');
  clone.insertBefore(rect, clone.firstChild);
}

async function downloadPng(svg: SVGSVGElement, filename: string) {
  const vb = svg.viewBox.baseVal;
  const scale = 2;
  const clone = inlineStyles(svg);
  withBackground(clone, svg);

  // Every family the diagram actually paints with, first entry only — the
  // rest of each stack is fallbacks.
  const families = new Set<string>();
  for (const text of Array.from(svg.querySelectorAll('text'))) {
    const first = getComputedStyle(text)
      .fontFamily.split(',')[0]
      .replace(/["']/g, '')
      .trim();
    if (first) families.add(first);
  }
  const fontCss = await inlineFontCss(families);
  if (fontCss) {
    const style = document.createElementNS(SVG_NS, 'style');
    style.textContent = fontCss;
    clone.insertBefore(style, clone.firstChild);
  }
  clone.setAttribute('width', String(vb.width));
  clone.setAttribute('height', String(vb.height));

  const xml = new XMLSerializer().serializeToString(clone);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not rasterize the diagram'));
    image.src = source;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vb.width * scale);
  canvas.height = Math.round(vb.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Could not encode the PNG');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
  // Not revoked synchronously: some browsers abort a download whose object
  // URL disappears in the same tick.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

interface DiagramActionsProps {
  /** The wrapper the diagram's <svg> lives in. */
  frameRef: React.RefObject<HTMLDivElement | null>;
  /** Used for the download filename, the citation and the dialog's label. */
  label: string;
  /** The figure's id, so the citation can deep-link to this diagram. */
  anchorId: string;
  /** Shown above and below the diagram in the full-screen view. */
  title?: string;
  caption?: string;
  corner: DiagramActionsCorner;
}

export function DiagramActions({
  frameRef,
  label,
  anchorId,
  title,
  caption,
  corner
}: DiagramActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const getSvg = useCallback(
    () => frameRef.current?.querySelector('svg') ?? null,
    [frameRef]
  );

  const onDownload = useCallback(async () => {
    const svg = getSvg();
    if (!svg) return;
    try {
      setFailed(false);
      await downloadPng(svg, slugify(label));
    } catch {
      // Nothing here is worth breaking the page over; the button says so.
      setFailed(true);
    }
  }, [getSvg, label]);

  const onCopyCitation = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildCitation(label, anchorId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }, [label, anchorId]);

  const onExpand = useCallback(() => {
    if (getSvg()) setExpanded(true);
  }, [getSvg]);

  useEffect(() => {
    if (!expanded) return;
    // Show a cloned node rather than re-rendering the diagram: the live one
    // keeps its ref and its played-once entrance, and a clone in the same
    // document still picks up the stylesheet. Cloning also keeps this off
    // innerHTML entirely.
    const svg = getSvg();
    // Captured now: cleanup must not reach through the ref, which may have
    // been detached by the time it runs.
    const stage = stageRef.current;
    if (svg && stage) {
      const copy = svg.cloneNode(true) as SVGSVGElement;
      freezeMotion(copy);
      stage.replaceChildren(copy);
    }
    const previous = document.activeElement as HTMLElement | null;
    const opener = openerRef.current;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      stage?.replaceChildren();
      (previous ?? opener)?.focus?.();
    };
  }, [expanded, getSvg]);

  return (
    <>
      <div className={`mdx-diagram-actions ${CORNER_CLASS[corner]}`}>
        <button
          type="button"
          onClick={onDownload}
          aria-label={
            failed ? 'Download failed, try again' : `Download ${label} as PNG`
          }
          title={failed ? 'Download failed — try again' : 'Download PNG'}
          data-failed={failed || undefined}
        >
          <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onCopyCitation}
          aria-label={`Copy citation for ${label}`}
          title={copied ? 'Citation copied' : 'Copy citation'}
          data-copied={copied || undefined}
        >
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            size={15}
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          ref={openerRef}
          onClick={onExpand}
          aria-label={`View ${label} full screen`}
          title="View full screen"
        >
          <HugeiconsIcon icon={BinocularsIcon} size={15} strokeWidth={2} />
        </button>
      </div>

      {expanded && (
        <div
          className="mdx-diagram-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <button
            type="button"
            ref={closeRef}
            className="mdx-diagram-lightbox-close"
            onClick={() => setExpanded(false)}
            aria-label="Close full screen view"
          >
            Close
          </button>
          <div className="mdx-diagram-lightbox-inner">
            {title && (
              <p className="mdx-diagram-lightbox-title">{richHtml(title)}</p>
            )}
            <div className="mdx-diagram-lightbox-stage" ref={stageRef} />
            {caption && (
              <p className="mdx-diagram-lightbox-caption">
                {richHtml(caption)}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
