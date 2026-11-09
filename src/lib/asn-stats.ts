/** Prefix-list statistics for an ASN view. Pure; safe on server and client. */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  )
    return null;
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

/** Parse "a.b.c.d/len" into [start, end] inclusive, or null. */
export function ipv4Range(cidr: string): [number, number] | null {
  const [ip, lenRaw] = cidr.split('/');
  const len = Number(lenRaw);
  const base = ipv4ToInt(ip);
  if (base === null || !Number.isInteger(len) || len < 0 || len > 32)
    return null;
  const size = 2 ** (32 - len);
  const start = base - (base % size);
  return [start, start + size - 1];
}

/**
 * Distinct IPv4 addresses covered by a prefix list. Overlaps (a /16 and the
 * /24s inside it, which ASNs routinely announce together) are counted once.
 */
export function ipv4AddressCount(prefixes: string[]): number {
  const ranges = prefixes
    .map(ipv4Range)
    .filter((r): r is [number, number] => r !== null)
    .sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let total = 0;
  let coveredTo = -1;
  for (const [start, end] of ranges) {
    if (end <= coveredTo) continue;
    total += end - Math.max(start, coveredTo + 1) + 1;
    coveredTo = end;
  }
  return total;
}

/** Sort key that orders IPv4 prefixes numerically and IPv6 lexically after them. */
export function prefixSortKey(cidr: string): string {
  const r = ipv4Range(cidr);
  if (!r) return `1${cidr}`;
  return `0${r[0].toString(16).padStart(8, '0')}${cidr.split('/')[1]?.padStart(3, '0')}`;
}

/** Count of prefixes by length, e.g. { '/24': 900, '/22': 40 }, most common first. */
export function lengthHistogram(prefixes: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const p of prefixes) {
    const len = `/${p.split('/')[1] ?? '?'}`;
    counts.set(len, (counts.get(len) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** "8.9M", "65.5K", "512". */
export function compactCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
