'use client';

import { useState, useMemo, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover';
import { Search, TableIcon } from 'lucide-react';
import type { HeaderEntry } from '@/lib/email-header-parser';
import { parseAuthenticationResults } from '@/lib/email-header-parser';
import type { ProviderHeaderValueToken } from '@/lib/provider-header-values';
import { AnnotatedRow, CommentMarker } from './annotation-components';
import { useAnnotation } from './annotation-provider';
import {
  getCardAnnotation,
  getHeaderAnnotation
} from '@/lib/header-annotations';
import { getProviderHeaderValueTokens } from '@/lib/provider-headers';

interface HeaderTableProps {
  headers: HeaderEntry[];
}

function formatAuthPropertyLabel(key: string) {
  return key
    .split('.')
    .map((segment) => {
      const lower = segment.toLowerCase();
      if (lower === 'smtp') return 'SMTP';
      if (lower === 'header') return 'Header';
      if (lower === 'mailfrom') return 'MAIL FROM';
      if (lower === 'from') return 'From';
      if (lower === 'dkim') return 'DKIM';
      if (lower === 'spf') return 'SPF';
      if (lower === 'dmarc') return 'DMARC';
      if (lower === 'reason') return 'Reason';
      if (lower === 'action') return 'Action';
      return segment.length <= 3 ? segment.toUpperCase() : segment;
    })
    .join('.');
}

function getAuthResultGuide(method: string) {
  if (method.toLowerCase() === 'compauth') {
    return {
      title: 'Composite authentication',
      description:
        'Microsoft-specific composite authentication that combines SPF, DKIM, DMARC, alignment, and additional message signals.',
      howToRead:
        'Read the verdict first, then use the reason code to understand why Microsoft trusted, downgraded, or rejected the message.'
    };
  }

  return getCardAnnotation(method);
}

function getAuthResultMeaning(result: string) {
  const lower = result.toLowerCase();

  if (lower === 'pass') return 'The check succeeded.';
  if (lower === 'fail' || lower === 'hardfail')
    return 'The check failed and should be treated as a stronger trust warning.';
  if (lower === 'softfail')
    return 'The check failed softly. The sender was not authorized, but the policy asked receivers not to hard reject.';
  if (lower === 'none')
    return 'No usable authentication record or signature was available for this check.';
  if (lower === 'neutral')
    return 'The sender published a neutral policy, so the receiver got no clear allow or deny signal.';
  if (lower === 'temperror')
    return 'The check could not complete because of a temporary error, often DNS or network related.';
  if (lower === 'permerror')
    return 'The check could not complete because of a permanent configuration or syntax error.';
  if (lower === 'bestguesspass')
    return 'The receiver inferred a likely pass even though a full DMARC policy was not published.';

  return `The receiver reported verdict "${result}".`;
}

function AuthHeaderValueDisplay({ header }: { header: HeaderEntry }) {
  const [showUnparsed, setShowUnparsed] = useState(false);
  const parsed = parseAuthenticationResults([header]);

  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {parsed.server && (
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          {parsed.server}
        </span>
      )}
      {parsed.results.map((result, index) => {
        const guide = getAuthResultGuide(result.method);
        const verdictMeaning = getAuthResultMeaning(result.result);
        const isPass = result.result.toLowerCase() === 'pass';
        const isFail = ['fail', 'hardfail', 'permerror'].includes(
          result.result.toLowerCase()
        );
        const isSoft = ['softfail', 'temperror'].includes(
          result.result.toLowerCase()
        );
        const chipClass = isPass
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200'
          : isFail
            ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200'
            : isSoft
              ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-border/70 bg-muted/35 text-muted-foreground';

        return (
          <Popover key={`${result.method}-${index}`}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] transition-colors hover:opacity-90 ${chipClass}`}
              >
                <span className="uppercase">{result.method}</span>
                <span className="mx-0.5 text-muted-foreground">=</span>
                <span className="font-semibold uppercase">{result.result}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[22rem]">
              <PopoverHeader>
                <PopoverTitle className="break-words leading-snug pr-4">
                  {guide?.title ?? result.method.toUpperCase()}
                </PopoverTitle>
                <PopoverDescription className="font-mono text-[11px] break-all text-muted-foreground/90">
                  {result.detail}
                </PopoverDescription>
              </PopoverHeader>
              <div className="space-y-2 text-xs">
                {guide && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      What this checks
                    </div>
                    <p className="text-muted-foreground">{guide.description}</p>
                  </div>
                )}
                <div>
                  <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Result
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] uppercase ${chipClass}`}
                    >
                      {result.result}
                    </span>
                    <p className="text-muted-foreground">{verdictMeaning}</p>
                  </div>
                </div>
                {result.explanation && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Why it matters here
                    </div>
                    <p className="text-muted-foreground">
                      {result.explanation}
                    </p>
                  </div>
                )}
                {result.properties &&
                  Object.keys(result.properties).length > 0 && (
                    <div>
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        Parsed fields
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(result.properties).map(
                          ([key, value]) => (
                            <span
                              key={`${result.method}-${key}`}
                              className="rounded-md border border-border/70 bg-muted/35 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {formatAuthPropertyLabel(key)}={value}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                {guide?.howToRead && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                      How to read
                    </div>
                    <p className="text-muted-foreground">{guide.howToRead}</p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
      <button
        type="button"
        onClick={() => setShowUnparsed((current) => !current)}
        className="inline-flex items-center rounded-md border border-dashed border-border/80 bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {showUnparsed ? 'hide raw header' : 'show raw header'}
      </button>
      {showUnparsed && (
        <div className="w-full rounded-md border border-border/70 bg-muted/25 px-2 py-2 font-mono text-[11px] leading-relaxed break-all text-muted-foreground">
          {header.value}
        </div>
      )}
    </div>
  );
}

function ParsedValueToken({
  raw,
  token
}: {
  raw: string;
  token: ProviderHeaderValueToken;
}) {
  const displayValue = token.value || '(blank)';
  const tokenLabel =
    token.kind === 'tag' ? (
      <>
        <span className="text-amber-700 dark:text-amber-300">{token.key}</span>
        <span className="text-muted-foreground">:</span>
        <span className="font-semibold">{displayValue}</span>
      </>
    ) : (
      <span className="font-semibold">{token.raw}</span>
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-left font-mono text-[11px] text-amber-950 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
        >
          {tokenLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle className="break-words leading-snug pr-4">
            {token.guide.title}
          </PopoverTitle>
          <PopoverDescription className="font-mono text-[11px] break-all text-muted-foreground/90">
            {raw}
          </PopoverDescription>
        </PopoverHeader>
        <div className="space-y-2 text-xs">
          <div>
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              What this means
            </div>
            <p className="text-muted-foreground">{token.guide.description}</p>
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Why it matters
            </div>
            <p className="text-muted-foreground">{token.guide.why}</p>
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              How to read
            </div>
            <p className="text-muted-foreground">{token.guide.howToRead}</p>
          </div>
          {token.guide.references && token.guide.references.length > 0 && (
            <div>
              <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                References
              </div>
              <div className="flex flex-wrap gap-1.5">
                {token.guide.references.map((reference) => (
                  <a
                    key={`${reference.label}-${reference.url}`}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {reference.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HeaderValueDisplay({ header }: { header: HeaderEntry }) {
  const [showRawHeader, setShowRawHeader] = useState(false);
  const isAuthHeader =
    /^(authentication-results|arc-authentication-results)$/i.test(header.name);

  if (isAuthHeader) {
    return <AuthHeaderValueDisplay header={header} />;
  }

  const tokens = getProviderHeaderValueTokens(header.name, header.value);

  if (tokens.length === 0) {
    return header.value;
  }

  const tokenByRaw = new Map(tokens.map((token) => [token.raw, token]));
  const rawTokens = header.value
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {rawTokens.map((rawToken, index) => {
        const token = tokenByRaw.get(rawToken);

        if (!token) {
          return (
            <span
              key={`${rawToken}-${index}`}
              className="rounded-md border border-border/70 bg-muted/35 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {rawToken}
            </span>
          );
        }

        return (
          <ParsedValueToken
            key={`${rawToken}-${index}`}
            raw={rawToken}
            token={token}
          />
        );
      })}
      <button
        type="button"
        onClick={() => setShowRawHeader((current) => !current)}
        className="inline-flex items-center rounded-md border border-dashed border-border/80 bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {showRawHeader ? 'hide raw header' : 'show raw header'}
      </button>
      {showRawHeader && (
        <div className="w-full rounded-md border border-border/70 bg-muted/25 px-2 py-2 font-mono text-[11px] leading-relaxed break-all text-muted-foreground">
          {header.value}
        </div>
      )}
    </div>
  );
}

function AnnotatedHeaderRow({
  header,
  idx
}: {
  header: HeaderEntry;
  idx: number;
}) {
  const annotationId = `header-${idx}-${header.name.toLowerCase()}`;
  const info = getHeaderAnnotation(header.name, header.value);
  const { openAnnotations, registerRow, cardSides } = useAnnotation();
  const isOpen = openAnnotations.has(annotationId);
  const side = cardSides.get(annotationId) ?? 'left';
  const leftAccent =
    isOpen && side === 'left'
      ? 'relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-amber-500 before:rounded-r'
      : '';
  const rightAccent =
    isOpen && side === 'right'
      ? 'relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-amber-500 after:rounded-l'
      : '';

  const refCallback = useCallback(
    (el: HTMLTableRowElement | null) => {
      registerRow(annotationId, isOpen ? el : null);
    },
    [annotationId, isOpen, registerRow]
  );

  return (
    <TableRow
      ref={refCallback}
      className={isOpen ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
    >
      <TableCell className={`font-mono text-muted-foreground ${leftAccent}`}>
        {idx + 1}
      </TableCell>
      <TableCell className="font-mono font-medium">
        <span className="inline-flex items-center gap-1.5">
          <span>{header.name}</span>
          <CommentMarker id={annotationId} info={info} />
        </span>
      </TableCell>
      <TableCell
        className={`font-mono break-all whitespace-normal max-w-[400px] ${rightAccent}`}
      >
        <HeaderValueDisplay header={header} />
      </TableCell>
    </TableRow>
  );
}

function MobileHeaderRow({
  header,
  idx
}: {
  header: HeaderEntry;
  idx: number;
}) {
  const annotationId = `mobile-header-${idx}-${header.name.toLowerCase()}`;
  const info = getHeaderAnnotation(header.name, header.value);

  return (
    <AnnotatedRow id={annotationId}>
      <div className="space-y-2 border-b px-3 py-3 last:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
              Header {idx + 1}
            </div>
            <div className="font-mono font-medium break-all">{header.name}</div>
          </div>
          <CommentMarker id={annotationId} info={info} />
        </div>
        <div className="rounded-md bg-muted/35 px-2.5 py-2 font-mono text-xs break-all whitespace-pre-wrap">
          <HeaderValueDisplay header={header} />
        </div>
      </div>
    </AnnotatedRow>
  );
}

export function HeaderTable({ headers }: HeaderTableProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return headers;
    const lower = filter.toLowerCase();
    return headers.filter(
      (h) =>
        h.name.toLowerCase().includes(lower) ||
        h.value.toLowerCase().includes(lower)
    );
  }, [headers, filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TableIcon className="h-4 w-4 text-primary" />
            </div>
            All Headers
          </CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {filter
              ? `${filtered.length} of ${headers.length}`
              : `${headers.length} headers`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name or value..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 font-mono"
          />
        </div>

        {/* Desktop table */}
        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    {filter
                      ? 'No headers match your filter.'
                      : 'No headers found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((header, idx) => (
                  <AnnotatedHeaderRow key={idx} header={header} idx={idx} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile list */}
        <div className="rounded-md border md:hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground">
              {filter ? 'No headers match your filter.' : 'No headers found.'}
            </div>
          ) : (
            filtered.map((header, idx) => (
              <MobileHeaderRow key={idx} header={header} idx={idx} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
