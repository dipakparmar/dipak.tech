// Runnable self-check: `bun run src/lib/upstream.check.ts`
// ponytail: assert-based, no test framework. Spins up a throwaway local server.
import assert from 'node:assert';
import { fetchJson, UpstreamError } from './upstream';

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/ok') return Response.json({ a: 1 });
    if (path === '/html502')
      return new Response('<html>Bad Gateway</html>', { status: 502 });
    if (path === '/api-error')
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    if (path === '/bare429') return new Response('slow down', { status: 429 });
    if (path === '/garbage') return new Response('{"a": 1', { status: 200 });
    if (path === '/empty') return new Response('', { status: 200 });
    if (path === '/slow') {
      await Bun.sleep(500);
      return Response.json({ late: true });
    }
    return new Response('nope', { status: 404 });
  }
});
const base = `http://localhost:${server.port}`;

async function rejects(path: string, opts = {}) {
  try {
    await fetchJson(`${base}${path}`, { label: 'svc', ...opts });
  } catch (e) {
    assert.ok(e instanceof UpstreamError, `${path}: not an UpstreamError`);
    return e;
  }
  throw new Error(`${path} should have rejected`);
}

assert.deepEqual(await fetchJson(`${base}/ok`), { a: 1 });

let e = await rejects('/html502');
assert.equal(e.message, 'svc returned HTTP 502');
assert.equal(e.status, 424, 'never 502: a CDN would mask the body');
assert.equal(e.upstreamStatus, 502);

e = await rejects('/api-error');
assert.equal(e.message, 'Rate limit exceeded', "prefers the body's error");

e = await rejects('/bare429');
assert.equal(e.message, 'svc is rate limiting requests; try again shortly');
assert.equal(e.upstreamStatus, 429);

e = await rejects('/garbage');
assert.equal(e.message, 'svc returned an unreadable response');

e = await rejects('/empty');
assert.equal(e.message, 'svc returned an unreadable response');

e = await rejects('/slow', { timeoutMs: 100 });
assert.equal(e.status, 424, 'never 504: a CDN would mask the body');
assert.equal(e.message, 'svc timed out after 0.1s');

e = await rejects('/missing');
assert.equal(e.upstreamStatus, 404);

// A caller's own cancellation is not dressed up as an upstream failure.
const ctrl = new AbortController();
const pending = fetchJson(`${base}/slow`, { signal: ctrl.signal });
ctrl.abort();
await assert.rejects(pending, (err: Error) => err.name === 'AbortError');

server.stop(true);
console.log('upstream.check: ok');
