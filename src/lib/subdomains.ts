import type { SubdomainEntry } from '@/lib/osint-types';

/** One certificate from a Certificate Transparency source, source-neutral. */
export interface CtCert {
  serial: string;
  issuer: string;
  names: string[];
  notBefore: string;
  notAfter: string;
}

/**
 * Fold CT certificates into one row per subdomain of `target`.
 * Names outside the target (other SANs on shared certs) are dropped; `*.x`
 * counts towards `x` with `wildcard` set. Rows are ordered active first,
 * then by most recent expiry, so a resolve limit keeps the live ones.
 */
export function buildSubdomains(
  target: string,
  certs: CtCert[],
  now = Date.now()
) {
  const seenSerials = new Set<string>();
  const rows = new Map<string, SubdomainEntry>();
  const issuerCounts = new Map<string, number>();
  let latestExpiry: string | null = null;

  for (const cert of certs) {
    // CT logs hold a precert and a final cert under one serial.
    const key = `${cert.serial}|${cert.issuer}`;
    if (seenSerials.has(key)) continue;
    seenSerials.add(key);

    issuerCounts.set(cert.issuer, (issuerCounts.get(cert.issuer) ?? 0) + 1);
    if (!latestExpiry || cert.notAfter > latestExpiry)
      latestExpiry = cert.notAfter;

    for (const raw of new Set(cert.names)) {
      const name = raw.trim().toLowerCase().replace(/\.$/, '');
      const wildcard = name.startsWith('*.');
      const host = wildcard ? name.slice(2) : name;
      if (host === target || !host.endsWith(`.${target}`)) continue;

      const row =
        rows.get(host) ??
        ({
          host,
          wildcard: false,
          certs: 0,
          firstSeen: null,
          lastExpiry: null,
          active: false,
          dns: { status: 'skipped', ips: [], cname: null }
        } satisfies SubdomainEntry);
      row.wildcard ||= wildcard;
      row.certs += 1;
      if (!row.firstSeen || cert.notBefore < row.firstSeen)
        row.firstSeen = cert.notBefore;
      if (!row.lastExpiry || cert.notAfter > row.lastExpiry)
        row.lastExpiry = cert.notAfter;
      row.active ||= Date.parse(cert.notAfter) > now;
      rows.set(host, row);
    }
  }

  const subdomains = [...rows.values()].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      (b.lastExpiry ?? '').localeCompare(a.lastExpiry ?? '') ||
      a.host.localeCompare(b.host)
  );
  const issuers = [...issuerCounts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { subdomains, issuers, latestExpiry };
}

// ponytail: keyword heuristic, swap for a scored list if it gets noisy.
const SENSITIVE =
  /(^|[.-])(admin|internal|intranet|corp|vpn|sso|auth|login|dev|develop|staging|stage|stg|test|qa|uat|sandbox|preview|beta|old|legacy|backup|bak|debug|jenkins|ci|git|gitlab|grafana|kibana|prometheus|db|mysql|postgres|redis|elastic|phpmyadmin|ftp|smtp|mail|remote|rdp)(?=[.\d-]|$)/;

/** Hostnames whose leftmost labels suggest non-public or pre-production surfaces. */
export function isSensitiveHost(host: string, target: string): boolean {
  const prefix = host.slice(0, -(target.length + 1));
  return SENSITIVE.test(prefix);
}
