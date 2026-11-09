'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useHaptics } from '@/hooks/use-haptics';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Share2,
  Check,
  X,
  Copy,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { HapticButton as Button } from '@/components/haptic-wrappers';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buildHref, normalizePathname } from '@/lib/host-routing';
import { fetchJson } from '@/lib/upstream';
import { matchProvider, ProviderPill } from '@/components/osint/pills';
import { cn } from '@/lib/utils';

interface CertEntry {
  serialNumber: string;
  commonName: string;
  issuerOrganization: string;
  issuerCommonName: string;
  dnsNames: string[];
  notBefore: string;
  notAfter: string;
  isWildcard: boolean;
  isPrecert: boolean;
  insertedTime: string;
}

interface SearchResponse {
  timeTakenMs: number;
  totalCount: number;
  results: CertEntry[];
}

/** One certificate; its precert twin (same serial) is folded in. */
type Row = CertEntry;

type View = 'all' | 'valid' | 'expiring' | 'expired';

/** Certificates fetched per request. */
const BATCH = 500;
/** Rows rendered before "show all". */
const PAGE = 50;
/** SANs shown before a row's own expand control. */
const SAN_PREVIEW = 3;
const DAY = 86_400_000;

function fetchBatch(domain: string, offset: number, signal: AbortSignal) {
  return fetchJson<SearchResponse>('https://ct.certkit.io/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ domain, sort: '', limit: BATCH, offset }),
    signal,
    timeoutMs: 20000,
    label: 'Certificate Transparency search'
  });
}

interface CTLogsViewerProps {
  initialDomain?: string;
}

export function CTLogsViewer({ initialDomain = '' }: CTLogsViewerProps) {
  const pathname = usePathname();
  const { trigger } = useHaptics();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialDomain);
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certs, setCerts] = useState<CertEntry[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; timeTaken: number } | null>(
    null
  );
  const {
    status: urlStatus,
    copied: urlCopied,
    copy: copyShareUrl
  } = useCopyToClipboard();
  const hasAutoSearched = useRef(false);
  const inFlight = useRef<AbortController | null>(null);

  const updateUrlWithDomain = useCallback(
    (domain: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (domain.trim()) params.set('domain', domain.trim());
      else params.delete('domain');
      const queryString = params.toString();
      const host = typeof window === 'undefined' ? '' : window.location.host;
      const resolvedPath = normalizePathname('tools', pathname, host);
      router.replace(`${resolvedPath}${queryString ? `?${queryString}` : ''}`, {
        scroll: false
      });
    },
    [router, pathname, searchParams]
  );

  const handleShareUrl = useCallback(() => {
    if (!query.trim()) return;
    const params = new URLSearchParams({ domain: query.trim() });
    const resolvedPath = normalizePathname(
      'tools',
      pathname,
      window.location.host
    );
    copyShareUrl(`${window.location.origin}${resolvedPath}?${params}`);
  }, [query, pathname, copyShareUrl]);

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) {
        setError('Please enter a domain to search');
        return;
      }
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      setLoading(true);
      setError(null);
      setLoadError(null);
      setCerts(null);
      setMeta(null);
      setSearched(q);
      updateUrlWithDomain(q);

      try {
        const data = await fetchBatch(q, 0, ctrl.signal);
        if (!data.results?.length) {
          setError('No certificates found for this domain');
          return;
        }
        setCerts(data.results);
        setMeta({ total: data.totalCount, timeTaken: data.timeTakenMs });
        trigger('success');
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to search certificate logs'
        );
        trigger('error');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [query, updateUrlWithDomain, trigger]
  );

  const loadMore = async () => {
    if (!certs || !searched) return;
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchBatch(searched, certs.length, ctrl.signal);
      setCerts((prev) => [...(prev ?? []), ...(data.results ?? [])]);
    } catch (err) {
      // Shown beside the button, which retries just this batch.
      if (!ctrl.signal.aborted)
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load more'
        );
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (initialDomain && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      handleSearch(initialDomain);
    }
  }, [initialDomain, handleSearch]);

  // Abort on unmount. Clearing the guard lets a remount (StrictMode in dev)
  // search again instead of being stranded on an aborted request.
  useEffect(
    () => () => {
      inFlight.current?.abort();
      hasAutoSearched.current = false;
    },
    []
  );

  return (
    <div className="space-y-4">
      <Card className="gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4 text-cyan-500" />
          Certificate Transparency search
          <span className="font-normal text-muted-foreground">
            · every certificate logged for a domain and its subdomains
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="example.com"
            aria-label="Domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 font-mono"
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShareUrl}
            disabled={!query.trim()}
            title="Copy share URL"
            aria-label={
              urlStatus === 'error'
                ? 'Copy failed'
                : urlCopied
                  ? 'Copied'
                  : 'Copy share URL'
            }
          >
            {urlStatus === 'error' ? (
              <X className="h-4 w-4 text-destructive" />
            ) : urlCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </Button>
        </form>
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {error}
              {searched && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => handleSearch(searched)}
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {loading && (
        <Card className="space-y-2 p-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </Card>
      )}

      {certs && meta && (
        <Results
          domain={searched}
          certs={certs}
          total={meta.total}
          timeTaken={meta.timeTaken}
          loadingMore={loadingMore}
          loadError={loadError}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}

function Results({
  domain,
  certs,
  total,
  timeTaken,
  loadingMore,
  loadError,
  onLoadMore
}: {
  domain: string;
  certs: CertEntry[];
  total: number;
  timeTaken: number;
  loadingMore: boolean;
  loadError: string | null;
  onLoadMore: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<View>('all');
  const [showAll, setShowAll] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const now = Date.now();

  const rows = useMemo(() => foldPrecerts(certs), [certs]);
  const status = (r: Row): Exclude<View, 'all'> => {
    const end = Date.parse(r.notAfter);
    return end < now ? 'expired' : end - now < 30 * DAY ? 'expiring' : 'valid';
  };
  const counts = {
    all: rows.length,
    valid: rows.filter((r) => status(r) === 'valid').length,
    expiring: rows.filter((r) => status(r) === 'expiring').length,
    expired: rows.filter((r) => status(r) === 'expired').length
  };

  const issuers = useMemo(() => {
    const byName = new Map<string, number>();
    rows.forEach((r) => {
      const name = r.issuerOrganization || r.issuerCommonName || 'Unknown';
      byName.set(name, (byName.get(name) ?? 0) + 1);
    });
    return [...byName].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const names = useMemo(
    () =>
      [...new Set(rows.flatMap((r) => r.dnsNames))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const needle = filter.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (view === 'all' || status(r) === view) &&
      (!needle ||
        r.commonName.toLowerCase().includes(needle) ||
        r.dnsNames.some((n) => n.toLowerCase().includes(needle)) ||
        `${r.issuerOrganization} ${r.issuerCommonName}`
          .toLowerCase()
          .includes(needle) ||
        r.serialNumber.toLowerCase().includes(needle))
  );
  const shown = showAll ? visible : visible.slice(0, PAGE);
  const osintHref = buildHref(
    'tools',
    `/osint?q=${encodeURIComponent(domain)}`,
    typeof window === 'undefined' ? '' : window.location.host
  );

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span>
          <b>{total.toLocaleString()}</b> certificates logged
          <span className="text-muted-foreground">
            {' '}
            · {certs.length.toLocaleString()} loaded ·{' '}
            {rows.length.toLocaleString()} after merging precerts · {timeTaken}
            ms
          </span>
        </span>
        <Link
          href={osintHref}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Resolve these subdomains in OSINT <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-1">
        {issuers.map(([name, n]) => {
          const p = matchProvider(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(filter === name ? '' : name)}
              title={`Filter to ${name}`}
              className={cn(
                'rounded-full',
                filter === name && 'ring-2 ring-primary/40'
              )}
            >
              <ProviderPill
                label={`${name} · ${n}`}
                domain={p?.domain ?? null}
                fallback={<ShieldCheck className="h-3 w-3" />}
              />
            </button>
          );
        })}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          {names.length} unique names in these certificates
        </summary>
        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 break-all font-mono leading-5">
            {names.join('  ')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 text-xs"
            onClick={() => copy(names.join('\n'))}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copy
          </Button>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter name, issuer or serial"
            aria-label="Filter certificates"
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
        <div
          className="flex rounded-md border p-0.5"
          role="group"
          aria-label="Show"
        >
          {(['all', 'valid', 'expiring', 'expired'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'rounded px-2 py-1 text-xs text-muted-foreground capitalize transition-colors',
                view === v && 'bg-muted font-medium text-foreground'
              )}
            >
              {v} <span className="tabular-nums">{counts[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 font-medium">Common name</th>
              <th className="px-3 py-1.5 font-medium">Names (SANs)</th>
              <th className="px-3 py-1.5 font-medium">Issuer</th>
              <th className="px-3 py-1.5 font-medium whitespace-nowrap">
                Issued
              </th>
              <th className="px-3 py-1.5 font-medium whitespace-nowrap">
                Expires
              </th>
              <th className="px-3 py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((r) => (
              <CertRow
                key={`${r.serialNumber}|${r.issuerCommonName}`}
                row={r}
                state={status(r)}
              />
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nothing matches.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.length > PAGE && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show fewer rows' : `Show all ${visible.length} rows`}
          </Button>
        )}
        {certs.length < total && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? 'Loading…'
              : `${loadError ? 'Retry: load' : 'Load'} ${Math.min(BATCH, total - certs.length).toLocaleString()} more (${(total - certs.length).toLocaleString()} not loaded)`}
          </Button>
        )}
      </div>
      {loadError && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {loadError}
        </p>
      )}
    </Card>
  );
}

function CertRow({
  row: r,
  state
}: {
  row: Row;
  state: 'valid' | 'expiring' | 'expired';
}) {
  const [open, setOpen] = useState(false);
  const sans = r.dnsNames.filter((n) => n !== r.commonName);
  const shownSans = open ? sans : sans.slice(0, SAN_PREVIEW);
  const days = Math.round((Date.parse(r.notAfter) - Date.now()) / DAY);
  const viewHref = buildHref(
    'tools',
    `/certificates/view/${r.serialNumber}`,
    typeof window === 'undefined' ? '' : window.location.host
  );

  return (
    <tr
      className={cn(
        'align-top',
        state === 'expired' && 'text-muted-foreground'
      )}
    >
      <td className="px-3 py-1.5 whitespace-nowrap">
        <span className="font-mono">{r.commonName}</span>
        {r.isWildcard && <Tag>wildcard</Tag>}
      </td>
      <td className="px-3 py-1.5 font-mono">
        {sans.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {shownSans.map((n) => (
              <span key={n} className="break-all">
                {n}
              </span>
            ))}
            {sans.length > SAN_PREVIEW && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="font-sans text-primary hover:underline"
                aria-expanded={open}
              >
                {open ? 'show fewer' : `show all ${sans.length}`}
              </button>
            )}
          </span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {r.issuerOrganization || '—'}
        {r.issuerCommonName && (
          <span className="text-muted-foreground"> · {r.issuerCommonName}</span>
        )}
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
        {r.notBefore.slice(0, 10)}
      </td>
      <td
        className={cn(
          'px-3 py-1.5 whitespace-nowrap tabular-nums',
          state === 'expiring' && 'text-amber-700 dark:text-amber-400',
          state === 'expired' && 'text-red-600/80 dark:text-red-400/80'
        )}
      >
        {r.notAfter.slice(0, 10)}
        <span className="text-muted-foreground">
          {' '}
          · {days < 0 ? `${-days}d ago` : `in ${days}d`}
        </span>
      </td>
      <td className="px-3 py-1.5 text-right">
        <Link href={viewHref} className="text-primary hover:underline">
          View
        </Link>
      </td>
    </tr>
  );
}

function Tag({
  children,
  title
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="ml-1.5 rounded bg-muted px-1 py-px align-middle text-[10px] font-medium text-muted-foreground"
    >
      {children}
    </span>
  );
}

/**
 * CT logs record a precertificate and the final certificate under the same
 * serial; keep one row per serial + issuing CA, newest first.
 */
function foldPrecerts(certs: CertEntry[]): Row[] {
  const rows = new Map<string, Row>();
  for (const c of certs) {
    const key = `${c.serialNumber}|${c.issuerCommonName}`;
    if (!rows.has(key) || !c.isPrecert) rows.set(key, c);
  }
  return [...rows.values()].sort((a, b) =>
    b.notBefore.localeCompare(a.notBefore)
  );
}
