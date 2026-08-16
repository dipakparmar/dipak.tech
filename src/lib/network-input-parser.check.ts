// Runnable self-check: `bun run src/lib/network-input-parser.check.ts`
// ponytail: assert-based, no test framework. Promote to a real suite if this file grows.
import assert from 'node:assert';
import { parseNetworkInput } from './network-input-parser';

const CASES: Array<[input: string, type: string, value?: string]> = [
  // Trailing-dot FQDNs — PTR values and DNS answers arrive this way.
  [
    'tp.3a3674792-frontier.amazon.ca.',
    'domain',
    'tp.3a3674792-frontier.amazon.ca'
  ],
  ['github.com.', 'domain', 'github.com'],
  ['8.8.8.8.', 'ipv4', '8.8.8.8'],
  // Everything else the parser classifies.
  ['tp.3a3674792-frontier.amazon.ca', 'domain'],
  ['8.8.8.8', 'ipv4'],
  ['1.1.1.0/24', 'cidr'],
  ['AS13335', 'asn'],
  ['2606:4700::1', 'ipv6'],
  ['https://github.com/foo', 'domain', 'github.com'],
  ['.', 'unknown'],
  ['', 'unknown'],
  ['not a host', 'unknown']
];

for (const [input, type, value] of CASES) {
  const got = parseNetworkInput(input);
  assert.equal(
    got.type,
    type,
    `${JSON.stringify(input)}: expected ${type}, got ${got.type}`
  );
  if (value !== undefined) {
    assert.equal(
      got.value,
      value,
      `${JSON.stringify(input)}: expected ${value}, got ${got.value}`
    );
  }
}

console.log(`parseNetworkInput: ${CASES.length} cases ok`);
