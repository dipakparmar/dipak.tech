import { NextResponse, type NextRequest } from 'next/server';

// ponytail: access logging only — Next production has no built-in request logs.
// Structured JSON so kubectl logs stays greppable. Add levels/redaction only if this falls short.
// ponytail: geo comes from Cloudflare's "Add visitor location headers" managed transform.
// Only country is sent by default; enable the transform in the CF dashboard for city/region/etc.
const GEO_HEADERS = {
  country: 'cf-ipcountry',
  city: 'cf-ipcity',
  region: 'cf-region',
  lat: 'cf-iplatitude',
  lon: 'cf-iplongitude',
  postal: 'cf-postal-code',
  timezone: 'cf-timezone'
} as const;

function geo(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, header] of Object.entries(GEO_HEADERS)) {
    const value = request.headers.get(header);
    if (value) out[key] = value;
  }
  return out;
}

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV == 'production') {
    console.log(
      JSON.stringify({
        level: 'info',
        method: request.method,
        host: request.headers.get('host'),
        path: request.nextUrl.pathname,
        // ponytail: CF-Connecting-IP is Cloudflare's trusted client IP; then XFF first hop, then x-real-ip.
        ip:
          request.headers.get('cf-connecting-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          null,
        ua: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ...geo(request),
        time: new Date().toISOString()
      })
    );
  }
  return NextResponse.next();
}

// Skip static assets and image optimizer so the log is requests, not noise.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
