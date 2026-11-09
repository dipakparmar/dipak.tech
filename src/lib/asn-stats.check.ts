// Runnable self-check: `bun run src/lib/asn-stats.check.ts`
// ponytail: assert-based, no test framework.
import assert from 'node:assert';
import {
  compactCount,
  ipv4AddressCount,
  ipv4Range,
  lengthHistogram,
  prefixSortKey
} from './asn-stats';

assert.deepEqual(ipv4Range('10.0.0.0/8'), [0x0a000000, 0x0affffff]);
assert.deepEqual(
  ipv4Range('192.168.1.77/24'),
  [0xc0a80100, 0xc0a801ff],
  'host bits masked'
);
assert.deepEqual(
  ipv4Range('255.255.255.255/32'),
  [0xffffffff, 0xffffffff],
  'top of space stays unsigned'
);
assert.equal(ipv4Range('2001:db8::/32'), null, 'IPv6 ignored');
assert.equal(ipv4Range('1.2.3/24'), null);

assert.equal(ipv4AddressCount(['198.51.100.0/24']), 256);
assert.equal(
  ipv4AddressCount(['198.51.100.0/24', '198.51.100.0/25', '198.51.100.128/26']),
  256,
  'more-specifics inside an aggregate count once'
);
assert.equal(
  ipv4AddressCount(['198.51.100.0/24', '203.0.113.0/24']),
  512,
  'disjoint add up'
);
assert.equal(
  ipv4AddressCount(['192.0.2.0/25', '192.0.2.0/24']),
  256,
  'order does not matter'
);
assert.equal(ipv4AddressCount(['2001:db8::/32', 'nonsense']), 0);

// 10.10 sorts before 10.9 as text but after it as an address.
const sorted = [
  '203.0.113.0/24',
  '2001:db8::/32',
  '10.10.0.0/16',
  '10.9.0.0/16',
  '198.51.100.0/24'
].sort((a, b) => prefixSortKey(a).localeCompare(prefixSortKey(b)));
assert.deepEqual(
  sorted,
  [
    '10.9.0.0/16',
    '10.10.0.0/16',
    '198.51.100.0/24',
    '203.0.113.0/24',
    '2001:db8::/32'
  ],
  'numeric, not lexical'
);

assert.deepEqual(lengthHistogram(['a/24', 'b/24', 'c/22']), [
  ['/24', 2],
  ['/22', 1]
]);
assert.equal(compactCount(8_912_896), '8.9M');
assert.equal(compactCount(512), '512');

console.log('asn-stats.check: ok');
