/**
 * Fetch JSON and turn every way that can go wrong — a hang, a dropped
 * connection, an HTML error page from a proxy, a truncated body — into an
 * UpstreamError with a readable message. Safe on server and client (no Node
 * or Next imports).
 *
 * `status` is what an API route should answer with: 504 for a timeout, 502 for
 * anything else. `upstreamStatus` is the HTTP status the source actually sent
 * (0 when there was no response), for callers that special-case e.g. 404.
 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 504,
    readonly upstreamStatus = 0
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export type FetchJsonOptions = RequestInit & {
  /** Default 8000. Covers reading the body, not just the headers. */
  timeoutMs?: number;
  /** Name used in error messages. Defaults to the URL's hostname. */
  label?: string;
  /** Called with the raw response before the body is read, e.g. to read headers. */
  onResponse?: (res: Response) => void;
};

export async function fetchJson<T>(
  url: string,
  {
    timeoutMs = 8000,
    label,
    signal,
    onResponse,
    ...init
  }: FetchJsonOptions = {}
): Promise<T> {
  const source = label ?? hostnameOf(url);
  const timeout = AbortSignal.timeout(timeoutMs);
  let res: Response;
  let text: string;

  try {
    res = await fetch(url, {
      ...init,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout
    });
    onResponse?.(res);
    text = await res.text();
  } catch (error) {
    // The caller cancelled on purpose: let them see their own AbortError.
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new UpstreamError(
        `${source} timed out after ${timeoutMs / 1000}s`,
        504
      );
    }
    throw new UpstreamError(`${source} is unreachable`, 502);
  }

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    // Our own API routes put a readable reason in `error`; prefer it.
    const reason =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `${source} returned HTTP ${res.status}`;
    throw new UpstreamError(reason, res.status === 504 ? 504 : 502, res.status);
  }

  if (body === undefined) {
    throw new UpstreamError(
      `${source} returned an unreadable response`,
      502,
      res.status
    );
  }

  return body as T;
}

/** For an API route's catch block: `return upstreamErrorResponse(e) ?? captureAPIError(...)`. */
export function upstreamErrorResponse(error: unknown): Response | null {
  return error instanceof UpstreamError
    ? Response.json({ error: error.message }, { status: error.status })
    : null;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'the server';
  }
}
