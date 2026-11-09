/**
 * SEO / social-preview extraction and validation from raw HTML.
 * Pure functions, safe on server and client.
 */

export interface SeoData {
  url: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  lang: string | null;
  viewport: string | null;
  favicon: string | null;
  themeColor: string | null;
  h1: string[];
  /** First value of every `og:*` property, keyed without the prefix (`image`, `image:width`, …). */
  og: Record<string, string>;
  /** First value of every `twitter:*` name, keyed without the prefix. */
  twitter: Record<string, string>;
  jsonLd: Array<{ types: string[]; error: string | null }>;
  hreflang: string[];
  /** The body was cut at the read cap; tags after it were not seen. */
  truncated: boolean;
  /** Same-origin proxy URLs for remote images, filled in by the API route. */
  proxied?: Record<string, string>;
}

export type CheckStatus = 'pass' | 'info' | 'warn' | 'fail';
export interface SeoCheck {
  group: 'Search' | 'Open Graph' | 'X / Twitter' | 'Structured data';
  status: CheckStatus;
  label: string;
  detail?: string;
}

const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = tag.replace(/^<\w+/, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(ATTR)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

export function decode(s: string): string {
  return s.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (m, e: string) => {
      const k = e.toLowerCase();
      if (k[0] === '#') {
        const code =
          k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return (
        { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[k] ?? m
      );
    }
  );
}

const text = (s: string) =>
  decode(s.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

function absolute(
  href: string | null | undefined,
  base: string
): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

export function parseSeo(
  html: string,
  url: string,
  truncated = false
): SeoData {
  // Ignore scripts/styles/comments when looking for tags (JSON-LD is read separately).
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  const metas = [...markup.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...markup.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const meta = (name: string) =>
    metas
      .find((a) => (a.name ?? a.property)?.toLowerCase() === name)
      ?.content?.trim() || null;

  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  for (const a of metas) {
    const key = (a.property ?? a.name ?? '').toLowerCase();
    const value = a.content?.trim();
    if (!value) continue;
    if (key.startsWith('og:') && !(key.slice(3) in og))
      og[key.slice(3)] = value;
    if (key.startsWith('twitter:') && !(key.slice(8) in twitter))
      twitter[key.slice(8)] = value;
  }

  const rel = (r: string) =>
    links.find((l) => l.rel?.toLowerCase().split(/\s+/).includes(r));
  const icon = rel('icon') ?? rel('shortcut') ?? rel('apple-touch-icon');

  const jsonLd = [
    ...html.matchAll(
      /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
    )
  ].map((m) => {
    try {
      return { types: ldTypes(JSON.parse(m[1])), error: null };
    } catch (e) {
      return {
        types: [],
        error: e instanceof Error ? e.message : 'Invalid JSON'
      };
    }
  });

  return {
    url,
    title:
      text(markup.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') ||
      null,
    description: meta('description'),
    canonical: rel('canonical')?.href?.trim() || null,
    robots: meta('robots'),
    lang: attrs(markup.match(/<html\b[^>]*>/i)?.[0] ?? '<html>').lang || null,
    viewport: meta('viewport'),
    favicon: absolute(icon?.href, url),
    themeColor: meta('theme-color'),
    h1: [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((m) => text(m[1]))
      .slice(0, 5),
    og,
    twitter,
    jsonLd,
    hreflang: links
      .filter((l) => l.rel?.toLowerCase() === 'alternate' && l.hreflang)
      .map((l) => l.hreflang),
    truncated
  };
}

function ldTypes(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(ldTypes);
  if (!node || typeof node !== 'object') return [];
  const o = node as Record<string, unknown>;
  const own = o['@type'] ? [o['@type']].flat().map(String) : [];
  return [...new Set([...own, ...ldTypes(o['@graph'] ?? [])])];
}

/* ---------- resolved values platforms actually use ---------- */

export function preview(seo: SeoData) {
  const image = absolute(
    seo.og.image ??
      seo.og['image:url'] ??
      seo.twitter.image ??
      seo.twitter['image:src'],
    seo.url
  );
  return {
    title: seo.og.title ?? seo.twitter.title ?? seo.title,
    description:
      seo.og.description ?? seo.twitter.description ?? seo.description,
    image,
    imageAlt: seo.og['image:alt'] ?? seo.twitter['image:alt'] ?? null,
    siteName: seo.og.site_name ?? null,
    host: hostOf(seo.og.url ?? seo.canonical ?? seo.url, seo.url),
    twitterCard: seo.twitter.card ?? null,
    twitterImage:
      absolute(seo.twitter.image ?? seo.twitter['image:src'], seo.url) ?? image
  };
}

function hostOf(href: string, base: string) {
  try {
    return new URL(href, base).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/* ---------- validation ---------- */

const TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'];

export function seoChecks(seo: SeoData): SeoCheck[] {
  const c: SeoCheck[] = [];
  const add = (
    group: SeoCheck['group'],
    status: CheckStatus,
    label: string,
    detail?: string
  ) => c.push({ group, status, label, detail });
  const S = 'Search' as const;
  const OG = 'Open Graph' as const;
  const X = 'X / Twitter' as const;

  // Search
  const t = seo.title;
  if (!t) add(S, 'fail', 'No <title>');
  else if (t.length < 10)
    add(S, 'warn', `Title is short (${t.length} chars)`, t);
  else if (t.length > 60)
    add(S, 'warn', `Title may be cut off (${t.length} chars, ~60 shown)`, t);
  else add(S, 'pass', `Title (${t.length} chars)`, t);

  const d = seo.description;
  if (!d)
    add(
      S,
      'warn',
      'No meta description',
      'Search engines will pick their own snippet.'
    );
  else if (d.length < 50)
    add(S, 'warn', `Description is short (${d.length} chars)`, d);
  else if (d.length > 160)
    add(
      S,
      'warn',
      `Description may be cut off (${d.length} chars, ~160 shown)`,
      d
    );
  else add(S, 'pass', `Description (${d.length} chars)`, d);

  if (!seo.canonical) add(S, 'warn', 'No canonical URL');
  else if (!/^https?:\/\//i.test(seo.canonical))
    add(S, 'warn', 'Canonical URL is relative', seo.canonical);
  else if (hostOf(seo.canonical, seo.url) !== hostOf(seo.url, seo.url))
    add(S, 'info', 'Canonical points to another host', seo.canonical);
  else add(S, 'pass', 'Canonical URL', seo.canonical);

  const robots = seo.robots?.toLowerCase() ?? '';
  if (/noindex|none/.test(robots))
    add(S, 'fail', 'Page asks not to be indexed', `robots: ${seo.robots}`);
  else if (/nofollow/.test(robots))
    add(S, 'warn', 'Links marked nofollow', `robots: ${seo.robots}`);
  else
    add(
      S,
      'pass',
      'Indexable',
      seo.robots
        ? `robots: ${seo.robots}`
        : 'No robots meta (defaults to index, follow)'
    );

  add(
    S,
    seo.lang ? 'pass' : 'warn',
    seo.lang ? `Language: ${seo.lang}` : 'No lang attribute on <html>'
  );
  add(
    S,
    seo.viewport ? 'pass' : 'warn',
    seo.viewport
      ? 'Mobile viewport set'
      : 'No viewport meta (not mobile-friendly)'
  );
  add(
    S,
    seo.favicon ? 'pass' : 'info',
    seo.favicon
      ? 'Favicon declared'
      : 'No favicon link (browsers try /favicon.ico)'
  );
  if (seo.h1.length === 0) add(S, 'warn', 'No <h1>');
  else if (seo.h1.length > 1)
    add(S, 'info', `${seo.h1.length} <h1> elements`, seo.h1.join(' · '));
  else add(S, 'pass', 'One <h1>', seo.h1[0]);
  if (seo.hreflang.length)
    add(
      S,
      'info',
      `${seo.hreflang.length} hreflang alternates`,
      seo.hreflang.join(', ')
    );

  // Open Graph
  const ogReq: Array<[string, string, CheckStatus]> = [
    ['title', 'og:title', 'warn'],
    ['description', 'og:description', 'warn'],
    ['image', 'og:image', 'fail'],
    ['url', 'og:url', 'info'],
    ['type', 'og:type', 'info'],
    ['site_name', 'og:site_name', 'info']
  ];
  for (const [key, label, missing] of ogReq) {
    const v = seo.og[key];
    if (v) add(OG, 'pass', label, v);
    else
      add(
        OG,
        missing,
        `No ${label}`,
        key === 'image'
          ? 'Facebook, LinkedIn, WhatsApp, Slack and iMessage show no image.'
          : key === 'title' || key === 'description'
            ? 'Most platforms fall back to the page title / description.'
            : undefined
      );
  }
  const img = seo.og.image;
  if (img && !/^https:\/\//i.test(img))
    add(
      OG,
      'warn',
      /^http:/i.test(img)
        ? 'og:image is not HTTPS'
        : 'og:image is not an absolute URL',
      img
    );
  if (img && !seo.og['image:alt'])
    add(
      OG,
      'info',
      'No og:image:alt',
      'Screen readers get no description of the image.'
    );
  if (img && !(seo.og['image:width'] && seo.og['image:height']))
    add(
      OG,
      'info',
      'og:image size not declared',
      'Declaring width/height lets Facebook render it on the first share.'
    );

  // X
  const card = seo.twitter.card;
  if (!card)
    add(X, 'warn', 'No twitter:card', 'X shows a plain link with no card.');
  else if (!TWITTER_CARDS.includes(card))
    add(
      X,
      'fail',
      `Unknown twitter:card "${card}"`,
      `Use one of ${TWITTER_CARDS.join(', ')}.`
    );
  else add(X, 'pass', `twitter:card ${card}`);
  if (card && !seo.twitter.image && !seo.og.image)
    add(X, 'warn', 'No image for the card');
  if (card && !seo.twitter.title && !seo.og.title)
    add(X, 'warn', 'No twitter:title or og:title');
  add(
    X,
    seo.twitter.site ? 'pass' : 'info',
    seo.twitter.site
      ? `twitter:site ${seo.twitter.site}`
      : 'No twitter:site handle'
  );

  // Structured data
  if (seo.jsonLd.length === 0)
    add('Structured data', 'info', 'No JSON-LD structured data');
  seo.jsonLd.forEach((b, i) =>
    b.error
      ? add(
          'Structured data',
          'fail',
          `JSON-LD block ${i + 1} does not parse`,
          b.error
        )
      : add(
          'Structured data',
          'pass',
          b.types.length
            ? b.types.join(', ')
            : `JSON-LD block ${i + 1} (no @type)`
        )
  );
  if (seo.truncated)
    add(
      'Structured data',
      'info',
      'Page was larger than the scan limit',
      'Tags late in the page may be missing.'
    );

  return c;
}

/** Checks on the og:image as actually loaded (pixel size). */
export function imageChecks(width: number, height: number): SeoCheck[] {
  const ratio = width / height;
  const g = 'Open Graph' as const;
  if (width < 200 || height < 200)
    return [
      {
        group: g,
        status: 'fail',
        label: `og:image is ${width}×${height}`,
        detail: 'Facebook ignores images under 200×200.'
      }
    ];
  const out: SeoCheck[] = [];
  if (width < 1200 || height < 630)
    out.push({
      group: g,
      status: 'warn',
      label: `og:image is ${width}×${height}`,
      detail: '1200×630 or larger renders sharp everywhere.'
    });
  else
    out.push({
      group: g,
      status: 'pass',
      label: `og:image is ${width}×${height}`
    });
  if (Math.abs(ratio - 1.91) > 0.25)
    out.push({
      group: g,
      status: 'info',
      label: `og:image ratio ${ratio.toFixed(2)}:1`,
      detail: 'Large cards are 1.91:1; other shapes get cropped.'
    });
  return out;
}
