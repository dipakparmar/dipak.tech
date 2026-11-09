import { NextResponse } from 'next/server';
import {
  buildRateLimitHeaders,
  checkRateLimit,
  getCached,
  getClientId,
  setCached
} from '@/lib/osint-cache';
import { captureAPIError } from '@/lib/sentry-utils';
import { parseEmailSecurity } from '@/lib/email-security';
import { answersOfType } from '@/lib/doh';
import { fetchJson, upstreamErrorResponse } from '@/lib/upstream';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'] as const;
const RESPONSE_CACHE_TTL = 5 * 60 * 1000;
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

type RecordType = (typeof RECORD_TYPES)[number];

interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSResponse {
  Status: number;
  Answer?: DNSRecord[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || searchParams.get('domain');

    if (!target) {
      return NextResponse.json(
        { error: 'Target parameter is required' },
        { status: 400 }
      );
    }

    const normalized = target.trim().toLowerCase();
    const cacheKey = `dns:${normalized}`;
    const cached = getCached<Record<string, unknown>>(cacheKey);
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
    const [mainResults, dmarcResult] = await Promise.all([
      Promise.allSettled(
        RECORD_TYPES.map((type) => queryDNS(normalized, type))
      ),
      queryDNS(`_dmarc.${normalized}`, 'TXT').catch(() => null)
    ]);

    const records: Record<RecordType, string[]> = {
      A: [],
      AAAA: [],
      CNAME: [],
      MX: [],
      NS: [],
      TXT: [],
      SOA: []
    };

    // Every lookup failing means the resolver is down, not that the domain has
    // no records — report that instead of an empty answer.
    const firstFailure = mainResults.find((r) => r.status === 'rejected');
    if (firstFailure && mainResults.every((r) => r.status === 'rejected')) {
      throw firstFailure.reason;
    }

    mainResults.forEach((result, index) => {
      const type = RECORD_TYPES[index];
      if (result.status === 'fulfilled' && result.value.Answer) {
        records[type] = answersOfType(result.value.Answer, type);
      }
    });

    const dmarcTxt = answersOfType(dmarcResult?.Answer, 'TXT');
    const emailSecurity = parseEmailSecurity([...records.TXT, ...dmarcTxt]);

    const payload = {
      target: normalized,
      records,
      emailSecurity
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
      captureAPIError(error, request, 500, { operation: 'dns_lookup' })
    );
  }
}

function queryDNS(name: string, type: RecordType): Promise<DNSResponse> {
  return fetchJson<DNSResponse>(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    {
      headers: { Accept: 'application/dns-json' },
      timeoutMs: 5000,
      label: 'DNS resolver'
    }
  );
}
