// Runnable self-check: `bun run src/lib/seo.check.ts`
// ponytail: assert-based, no test framework.
import assert from 'node:assert';
import { imageChecks, parseSeo, preview, seoChecks } from './seo';

const html = `<!doctype html><html lang="en-GB"><head>
<title> Don&#39;t Panic &amp; Co </title>
<meta name="description" content="Don't panic: it's only a test page, with an apostrophe inside double quotes.">
<meta content="summary_large_image" name=twitter:card>
<meta property="og:title" content='Say "hi"'>
<meta property="og:image" content="/img/card.png">
<meta property="og:image" content="/img/second.png">
<link rel="icon" href="/favicon.svg"><link rel="canonical" href="https://example.com/">
<!-- <meta property="og:description" content="commented out"> -->
<script>var s = '<meta property="og:type" content="fake">';</script>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["WebSite","Thing"]}]}</script>
<script type="application/ld+json">{ broken </script>
</head><body><h1>Hello <b>world</b></h1></body></html>`;

const seo = parseSeo(html, 'https://www.example.com/page');

assert.equal(seo.title, "Don't Panic & Co");
assert.equal(
  seo.description?.startsWith("Don't panic: it's"),
  true,
  'apostrophe inside double quotes survives'
);
assert.equal(
  seo.og.title,
  'Say "hi"',
  'double quote inside single quotes survives'
);
assert.equal(seo.og.image, '/img/card.png', 'first og:image wins');
assert.equal(
  seo.twitter.card,
  'summary_large_image',
  'unquoted attrs, reversed order'
);
assert.equal(seo.og.description, undefined, 'commented-out tags ignored');
assert.equal(seo.og.type, undefined, 'tags inside <script> ignored');
assert.equal(seo.lang, 'en-GB');
assert.equal(seo.favicon, 'https://www.example.com/favicon.svg');
assert.deepEqual(seo.h1, ['Hello world']);
assert.deepEqual(seo.jsonLd[0], {
  types: ['Organization', 'WebSite', 'Thing'],
  error: null
});
assert.ok(seo.jsonLd[1].error, 'broken JSON-LD reported');

const p = preview(seo);
assert.equal(
  p.image,
  'https://www.example.com/img/card.png',
  'relative og:image resolved'
);
assert.equal(p.host, 'example.com');
assert.equal(
  p.description?.startsWith("Don't"),
  true,
  'falls back to meta description'
);

const checks = seoChecks(seo);
const find = (label: string) => checks.find((c) => c.label.startsWith(label));
assert.equal(find('og:image is not an absolute URL')?.status, 'warn');
assert.equal(find('JSON-LD block 2 does not parse')?.status, 'fail');
assert.equal(find('Organization')?.status, 'pass');
assert.equal(find('twitter:card summary_large_image')?.status, 'pass');
assert.equal(find('Indexable')?.status, 'pass');

const noindex = seoChecks(
  parseSeo('<meta name="robots" content="noindex,follow">', 'https://a.test/')
);
assert.equal(
  noindex.find((c) => c.label === 'Page asks not to be indexed')?.status,
  'fail'
);
assert.equal(noindex.find((c) => c.label === 'No og:image')?.status, 'fail');
assert.equal(noindex.find((c) => c.label === 'No <title>')?.status, 'fail');

assert.equal(imageChecks(100, 100)[0].status, 'fail');
assert.equal(imageChecks(1200, 630)[0].status, 'pass');
assert.equal(
  imageChecks(800, 800)
    .map((c) => c.status)
    .join(),
  'warn,info'
);

console.log('seo.check: ok');
