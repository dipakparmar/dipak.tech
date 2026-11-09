'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/upstream';

export interface Source<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

/**
 * Fetch one OSINT source. `url: null` means "not requested" (not applicable,
 * or a lazy tab that hasn't been opened yet). Changing the URL or unmounting
 * aborts the in-flight request, so a slow answer for an old query can never
 * land on a new one.
 */
export function useSource<T>(
  url: string | null,
  label: string,
  timeoutMs = 25000
): Source<T> {
  const [attempt, setAttempt] = useState(0);
  const key = url ? `${url}#${attempt}` : null;
  const [settled, setSettled] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!url || !key) return;
    const ctrl = new AbortController();
    fetchJson<T>(url, { signal: ctrl.signal, timeoutMs, label })
      .then((data) => setSettled({ key, data, error: null }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setSettled({
          key,
          data: null,
          error: err instanceof Error ? err.message : `${label} failed`
        });
      });
    return () => ctrl.abort();
  }, [url, key, label, timeoutMs]);

  const current = settled?.key === key ? settled : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(key) && !current,
    retry: () => setAttempt((n) => n + 1)
  };
}
