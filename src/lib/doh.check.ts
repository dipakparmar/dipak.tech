// Runnable self-check: `bun run src/lib/doh.check.ts`
// ponytail: assert-based, no test framework.
import assert from 'node:assert';
import { answersOfType } from './doh';

// Real Cloudflare DoH response for an MX query against www.prophecygov.com,
// which is a CNAME to sites.framer.app. — the resolver answers every query type
// with the CNAME.
const cnameOnly = [{ type: 5, data: 'sites.framer.app.' }];

assert.deepEqual(
  answersOfType(cnameOnly, 'MX'),
  [],
  'a CNAME is not an MX record'
);
assert.deepEqual(
  answersOfType(cnameOnly, 'NS'),
  [],
  'a CNAME is not an NS record'
);
assert.deepEqual(
  answersOfType(cnameOnly, 'DS'),
  [],
  'a CNAME is not a DS record'
);
assert.deepEqual(answersOfType(cnameOnly, 'CNAME'), ['sites.framer.app.']);

// An A query on the same name returns the CNAME hop *and* the addresses.
const chain = [
  { type: 5, data: 'sites.framer.app.' },
  { type: 1, data: '31.43.160.6' },
  { type: 1, data: '31.43.161.6' }
];

assert.deepEqual(answersOfType(chain, 'A'), ['31.43.160.6', '31.43.161.6']);
assert.deepEqual(answersOfType(chain, 'AAAA'), []);
assert.deepEqual(answersOfType(undefined, 'A'), []);

console.log('answersOfType: 7 cases ok');
