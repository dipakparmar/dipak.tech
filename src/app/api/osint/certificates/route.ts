import { NextResponse } from 'next/server';
import {
  buildRateLimitHeaders,
  checkRateLimit,
  getCached,
  getClientId,
  setCached
} from '@/lib/osint-cache';
import { captureAPIError } from '@/lib/sentry-utils';
import { answersOfType } from '@/lib/doh';
import { fetchJson, upstreamErrorResponse } from '@/lib/upstream';
import { buildSubdomains, type CtCert } from '@/lib/subdomains';
import type { CertificateData, SubdomainDns } from '@/lib/osint-types';

const RESPONSE_CACHE_TTL = 60 * 60 * 1000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
/** Certificates fetched per scan. */
const CERT_LIMIT = 1000;
/** Subdomains resolved per scan, most recently certified first. */
const RESOLVE_LIMIT = 200;
const RESOLVE_CONCURRENCY = 25;
const HOSTNAME =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = (searchParams.get('target') || searchParams.get('domain'))
      ?.trim()
      .toLowerCase()
      .replace(/\.$/, '')
      .replace(/^www\./, '');

    if (!target || !HOSTNAME.test(target)) {
      return NextResponse.json(
        { error: 'A valid domain name is required' },
        { status: 400 }
      );
    }

    const cacheKey = `certs:v2:${target}`;
    const cached = getCached<CertificateData>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }

    const clientId = getClientId(request.headers);
    const rateInfo = checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rateInfo.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(RATE_LIMIT, rateInfo),
            'Retry-After': String(Math.ceil(rateInfo.resetAt / 1000))
          }
        }
      );
    }

    const { source, total, certs } = await fetchCerts(target);
    const { subdomains, issuers, latestExpiry } = buildSubdomains(
      target,
      certs
    );

    const toResolve = subdomains.slice(0, RESOLVE_LIMIT);
    const dns = await mapLimit(toResolve, RESOLVE_CONCURRENCY, (s) =>
      resolveHost(s.host)
    );
    toResolve.forEach((s, i) => (s.dns = dns[i]));

    const payload: CertificateData = {
      target,
      source,
      totalCerts: total,
      scannedCerts: certs.length,
      issuers,
      latestExpiry,
      subdomains,
      resolveLimit: RESOLVE_LIMIT
    };

    setCached(cacheKey, payload, RESPONSE_CACHE_TTL);

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'MISS',
        ...buildRateLimitHeaders(RATE_LIMIT, rateInfo)
      }
    });
  } catch (error) {
    return (
      upstreamErrorResponse(error) ??
      captureAPIError(error, request, 500, {
        operation: 'certificate_lookup'
      })
    );
  }
}

/** CertKit first; crt.sh as a fallback. */
async function fetchCerts(
  domain: string
): Promise<{
  source: CertificateData['source'];
  total: number;
  certs: CtCert[];
}> {
  try {
    const data = await fetchJson<{
      totalCount?: number;
      results?: Array<{
        serialNumber: string;
        issuerOrganization?: string;
        issuerCommonName?: string;
        dnsNames?: string[];
        notBefore: string;
        notAfter: string;
      }>;
    }>('https://ct.certkit.io/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ domain, sort: '', limit: CERT_LIMIT }),
      timeoutMs: 10000,
      label: 'CertKit'
    });
    const results = data.results ?? [];
    return {
      source: 'certkit',
      total: data.totalCount ?? results.length,
      certs: results.map((c) => ({
        serial: c.serialNumber,
        issuer: c.issuerOrganization || c.issuerCommonName || 'Unknown',
        names: c.dnsNames ?? [],
        notBefore: c.notBefore,
        notAfter: c.notAfter
      }))
    };
  } catch (certkitError) {
    console.warn('CertKit failed, falling back to crt.sh:', certkitError);
  }

  const rows = await fetchJson<
    Array<{
      serial_number: string;
      issuer_name: string;
      name_value: string;
      not_before: string;
      not_after: string;
    }>
  >(`https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`, {
    headers: { 'User-Agent': 'dipak.tech-osint/1.0' },
    timeoutMs: 20000,
    label: 'Certificate Transparency (CertKit and crt.sh)'
  });
  return {
    source: 'crt.sh',
    total: rows.length,
    certs: rows.slice(0, CERT_LIMIT).map((r) => ({
      serial: r.serial_number,
      issuer: r.issuer_name.match(/O=([^,]+)/)?.[1] ?? r.issuer_name,
      names: r.name_value.split('\n'),
      notBefore: r.not_before,
      notAfter: r.not_after
    }))
  };
}

type DohAnswer = {
  Status: number;
  Answer?: Array<{ type: number; data: string }>;
};

async function resolveHost(host: string): Promise<SubdomainDns> {
  const query = (type: 'A' | 'AAAA') =>
    fetchJson<DohAnswer>(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' }, timeoutMs: 4000 }
    );
  try {
    const a = await query('A');
    // Kept even on NXDOMAIN: a CNAME to a name that no longer exists is the
    // dangling-record case the UI flags.
    const cname = answersOfType(a.Answer, 'CNAME')[0] ?? null;
    if (a.Status === 3) return { status: 'nxdomain', ips: [], cname };
    let ips = answersOfType(a.Answer, 'A');
    if (ips.length === 0)
      ips = answersOfType((await query('AAAA')).Answer, 'AAAA');
    return { status: ips.length ? 'resolved' : 'noanswer', ips, cname };
  } catch {
    return { status: 'error', ips: [], cname: null };
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}
