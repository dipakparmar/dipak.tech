// Runnable self-check: `bun run src/lib/subdomains.check.ts`
// ponytail: assert-based, no test framework.
import assert from 'node:assert';
import { buildSubdomains, isSensitiveHost } from './subdomains';

const now = Date.parse('2026-06-01T00:00:00Z');
const cert = (
  serial: string,
  names: string[],
  notAfter: string,
  issuer = 'LE'
) => ({
  serial,
  issuer,
  names,
  notBefore: '2025-01-01T00:00:00Z',
  notAfter
});

const { subdomains, issuers, latestExpiry } = buildSubdomains(
  'example.com',
  [
    cert(
      '1',
      ['example.com', 'www.example.com', 'API.example.com.'],
      '2027-01-01T00:00:00Z'
    ),
    cert('1', ['example.com', 'www.example.com'], '2027-01-01T00:00:00Z'), // precert twin
    cert(
      '2',
      ['*.dev.example.com', 'other.org', 'notexample.com'],
      '2026-12-01T00:00:00Z',
      'DigiCert'
    ),
    cert('3', ['old.example.com'], '2020-01-01T00:00:00Z')
  ],
  now
);

const hosts = subdomains.map((s) => s.host);
assert.deepEqual(
  hosts,
  ['api.example.com', 'www.example.com', 'dev.example.com', 'old.example.com'],
  'active first, newest expiry first; apex, foreign SANs and look-alikes dropped'
);
assert.equal(
  subdomains.find((s) => s.host === 'www.example.com')!.certs,
  1,
  'precert twin counted once'
);
assert.equal(
  subdomains.find((s) => s.host === 'dev.example.com')!.wildcard,
  true
);
assert.equal(
  subdomains.find((s) => s.host === 'old.example.com')!.active,
  false
);
assert.deepEqual(issuers, [
  { name: 'LE', count: 2 },
  { name: 'DigiCert', count: 1 }
]);
assert.equal(latestExpiry, '2027-01-01T00:00:00Z');

assert.equal(isSensitiveHost('staging-api.example.com', 'example.com'), true);
assert.equal(isSensitiveHost('dev2.example.com', 'example.com'), true);
assert.equal(isSensitiveHost('admin.eu.example.com', 'example.com'), true);
assert.equal(
  isSensitiveHost('developers.example.com', 'example.com'),
  false,
  'whole label only'
);
assert.equal(isSensitiveHost('www.example.com', 'example.com'), false);
// The target itself is excluded from the prefix check.
assert.equal(isSensitiveHost('www.dev.com', 'dev.com'), false);

console.log('subdomains.check: ok');
