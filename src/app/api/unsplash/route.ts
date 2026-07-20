import { type NextRequest, NextResponse } from 'next/server';

import {
  buildRateLimitHeaders,
  checkRateLimit,
  getCached,
  getClientId,
  setCached
} from '@/lib/osint-cache';
import { captureAPIError } from '@/lib/sentry-utils';

export const runtime = 'nodejs';

const RESPONSE_CACHE_TTL = 60 * 60 * 1000; // 1h - search results are stable
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_QUERY_LEN = 100;
const PER_PAGE = 24;

// Only our own sites may call this. Origin/Referer are spoofable outside a
// browser, so this is a filter (blocks other-site abuse) not a wall - the real
// caps are the rate limit above, response caching, and Unsplash's own quota.
const ALLOWED_HOST_SUFFIXES = ['dipak.tech', 'dipak.io', 'localhost'];

function hostAllowed(value: string | null): boolean {
  if (!value) return true; // same-origin requests may omit Origin/Referer
  try {
    const host = new URL(value).hostname;
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

function isSameApp(request: NextRequest): boolean {
  return (
    hostAllowed(request.headers.get('origin')) &&
    hostAllowed(request.headers.get('referer'))
  );
}

type UnsplashPhoto = {
  id: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  color: string | null;
  urls: { thumb: string; small: string; regular: string; full: string };
  links: { download_location: string };
  user: { name: string; links: { html: string } };
};

function normalize(photo: UnsplashPhoto) {
  return {
    id: photo.id,
    alt: photo.alt_description || photo.description || 'Unsplash photo',
    width: photo.width,
    height: photo.height,
    color: photo.color,
    thumb: photo.urls.small,
    full: photo.urls.regular,
    downloadLocation: photo.links.download_location,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html
  };
}

export async function GET(request: NextRequest) {
  try {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'Unsplash is not configured' },
        { status: 503 }
      );
    }
    if (!isSameApp(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clientId = getClientId(request.headers);
    const rate = checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(RATE_LIMIT, rate),
            'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000))
          }
        }
      );
    }
    const rateHeaders = buildRateLimitHeaders(RATE_LIMIT, rate);

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download');

    // Attribution requirement: ping Unsplash's download endpoint when a photo
    // is actually used. Restricted to Unsplash hosts to avoid an open proxy.
    if (download) {
      let target: URL;
      try {
        target = new URL(download);
      } catch {
        return NextResponse.json(
          { error: 'Bad download URL' },
          { status: 400 }
        );
      }
      if (target.hostname !== 'api.unsplash.com') {
        return NextResponse.json(
          { error: 'Bad download URL' },
          { status: 400 }
        );
      }
      await fetch(target, {
        headers: { Authorization: `Client-ID ${key}` }
      });
      return NextResponse.json({ ok: true }, { headers: rateHeaders });
    }

    const query = (searchParams.get('query') || '')
      .trim()
      .slice(0, MAX_QUERY_LEN);
    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400, headers: rateHeaders }
      );
    }
    const page = Math.min(
      Math.max(Number(searchParams.get('page')) || 1, 1),
      20
    );

    const cacheKey = `unsplash:${query.toLowerCase()}:${page}`;
    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { ...rateHeaders, 'X-Cache': 'HIT' }
      });
    }

    const api = new URL('https://api.unsplash.com/search/photos');
    api.searchParams.set('query', query);
    api.searchParams.set('page', String(page));
    api.searchParams.set('per_page', String(PER_PAGE));
    api.searchParams.set('content_filter', 'high');

    const upstream = await fetch(api, {
      headers: { Authorization: `Client-ID ${key}` }
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Unsplash returned ${upstream.status}` },
        { status: 502, headers: rateHeaders }
      );
    }
    const data = (await upstream.json()) as {
      results: UnsplashPhoto[];
      total_pages: number;
    };
    const payload = {
      results: data.results.map(normalize),
      totalPages: Math.min(data.total_pages, 20)
    };
    setCached(cacheKey, payload, RESPONSE_CACHE_TTL);

    return NextResponse.json(payload, {
      headers: { ...rateHeaders, 'X-Cache': 'MISS' }
    });
  } catch (error) {
    return captureAPIError(error, request, 500, {
      operation: 'unsplash_search'
    });
  }
}
