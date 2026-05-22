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
import { AnnotatedRow, CommentMarker } from './annotation-components';
import { useAnnotation } from './annotation-provider';
import { getHeaderAnnotation } from '@/lib/header-annotations';
import { getProviderHeaderValueTokens } from '@/lib/provider-headers';

interface HeaderTableProps {
  headers: HeaderEntry[];
}

function ParsedValueToken({
  raw,
  token
}: {
  raw: string;
  token: ReturnType<typeof getProviderHeaderValueTokens>[number];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-left font-mono text-[11px] text-amber-950 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
        >
          <span className="text-amber-700 dark:text-amber-300">
            {token.key}
          </span>
          <span className="text-muted-foreground">:</span>
          <span className="font-semibold">{token.value || '∅'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{token.guide.title}</PopoverTitle>
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
    <div className="flex flex-wrap gap-1.5">
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
