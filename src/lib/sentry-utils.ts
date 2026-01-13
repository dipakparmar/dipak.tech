import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

interface RequestContext {
  url: string;
  method: string;
  userAgent: string | null;
  clientIP: string;
  cacheStatus?: 'HIT' | 'MISS';
  rateLimitStatus?: {
    allowed: boolean;
    remaining: number;
    limit: number;
  };
  operation?: string;
  [key: string]: unknown;
}

/**
 * Extract request context from Next.js request object
 */
export function extractRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);
  const forwardedFor = request.headers.get('x-forwarded-for');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  return {
    url: url.pathname + url.search,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    clientIP: forwardedFor || cfConnectingIP || 'unknown'
  };
}

/**
 * Capture API errors to Sentry with enriched context.
 * Only captures 500+ errors (excludes validation errors).
 *
 * @param error - The error object
 * @param request - The Next.js Request object
 * @param statusCode - HTTP status code (only 500+ are captured to Sentry)
 * @param additionalContext - Optional context (cache, rate limit, operation, etc.)
 * @returns NextResponse with error message
 */
export function captureAPIError(
  error: unknown,
  request: Request,
  statusCode: number = 500,
  additionalContext?: Partial<RequestContext>
): NextResponse {
  const context = {
    ...extractRequestContext(request),
    ...additionalContext
  };

  // Only capture server errors (500+) to Sentry, skip client errors (400-499)
  if (statusCode >= 500) {
    Sentry.withScope((scope) => {
      // Set request context
      scope.setContext('request', {
        url: context.url,
        method: context.method,
        userAgent: context.userAgent,
        clientIP: context.clientIP
      });

      // Set tags for filtering in Sentry dashboard
      scope.setTag('api.route', context.url.split('?')[0]);
      scope.setTag('http.status_code', statusCode.toString());

      if (context.cacheStatus) {
        scope.setTag('cache.status', context.cacheStatus);
      }

      if (context.rateLimitStatus) {
        scope.setContext('rate_limit', context.rateLimitStatus);
        scope.setTag('rate_limit.hit', (!context.rateLimitStatus.allowed).toString());
      }

      if (context.operation) {
        scope.setTag('operation', context.operation);
      }

      // Capture the exception
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(
          typeof error === 'string' ? error : 'Unknown API error',
          'error'
        );
      }
    });
  }

  // Always log to console for development
  console.error('API Error:', error);

  // Return error response
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';

  return NextResponse.json({ error: errorMessage }, { status: statusCode });
}
