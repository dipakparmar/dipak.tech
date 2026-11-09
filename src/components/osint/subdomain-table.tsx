'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, Rows3, Search, Workflow } from 'lucide-react';
import { SubdomainGraph } from '@/components/osint/subdomain-graph';
import { IpChip } from '@/components/osint/pills';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { isSensitiveHost } from '@/lib/subdomains';
import type { CertificateData, SubdomainEntry } from '@/lib/osint-types';
import { cn } from '@/lib/utils';

const PAGE = 50;

type View = 'all' | 'live' | 'dead' | 'flagged';

export function isDangling(s: SubdomainEntry) {
  return (
    Boolean(s.dns.cname) &&
    (s.dns.status === 'nxdomain' || s.dns.status === 'noanswer')
  );
}

function isDead(s: SubdomainEntry) {
  return s.dns.status === 'nxdomain' || s.dns.status === 'noanswer';
}

export function SubdomainTable({ data }: { data: CertificateData }) {
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<View>('all');
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<'table' | 'graph'>('table');
  const { copied, copy } = useCopyToClipboard();

  const rows = useMemo(
    () =>
      data.subdomains.map((s) => ({
        ...s,
        sensitive: isSensitiveHost(s.host, data.target),
        dangling: isDangling(s)
      })),
    [data]
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      live: rows.filter((r) => r.dns.status === 'resolved').length,
      dead: rows.filter(isDead).length,
      flagged: rows.filter(
        (r) => r.dangling || (r.sensitive && r.dns.status === 'resolved')
      ).length
    }),
    [rows]
  );

  const topIps = useMemo(() => {
    const byIp = new Map<string, number>();
    rows.forEach((r) =>
      r.dns.ips.forEach((ip) => byIp.set(ip, (byIp.get(ip) ?? 0) + 1))
    );
    return [...byIp]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [rows]);
  const uniqueIps = new Set(rows.flatMap((r) => r.dns.ips)).size;

  const needle = filter.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (view === 'live' && r.dns.status !== 'resolved') return false;
    if (view === 'dead' && !isDead(r)) return false;
    if (
      view === 'flagged' &&
      !(r.dangling || (r.sensitive && r.dns.status === 'resolved'))
    )
      return false;
    if (!needle) return true;
    return (
      r.host.includes(needle) ||
      r.dns.ips.some((ip) => ip.includes(needle)) ||
      (r.dns.cname ?? '').includes(needle)
    );
  });
  const shown = showAll ? visible : visible.slice(0, PAGE);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No subdomains in {data.scannedCerts} certificates from {data.source}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {rows.length} hosts from {data.scannedCerts}
        {data.totalCerts > data.scannedCerts &&
          ` of ${data.totalCerts.toLocaleString()}`}{' '}
        certificates via {data.source === 'certkit' ? 'CertKit' : 'crt.sh'} ·{' '}
        {counts.live} resolve to {uniqueIps} IPs
        {rows.length > data.resolveLimit &&
          ` · first ${data.resolveLimit} resolved`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter host, IP or CNAME"
            aria-label="Filter subdomains"
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
        <div
          className="flex rounded-md border p-0.5"
          role="group"
          aria-label="Show"
        >
          {(['all', 'live', 'dead', 'flagged'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'rounded px-2 py-1 text-xs capitalize text-muted-foreground transition-colors',
                view === v && 'bg-muted font-medium text-foreground'
              )}
            >
              {v} <span className="tabular-nums">{counts[v]}</span>
            </button>
          ))}
        </div>
        <div
          className="flex rounded-md border p-0.5"
          role="group"
          aria-label="Layout"
        >
          {(
            [
              ['table', Rows3],
              ['graph', Workflow]
            ] as const
          ).map(([m, Icon]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-xs capitalize text-muted-foreground transition-colors',
                mode === m && 'bg-muted font-medium text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => copy(visible.map((r) => r.host).join('\n'))}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy {visible.length}
        </Button>
      </div>

      {topIps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Shared IPs</span>
          {topIps.map(([ip, n]) => (
            <button
              key={ip}
              type="button"
              onClick={() => setFilter(filter === ip ? '' : ip)}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono hover:bg-muted',
                filter === ip && 'border-primary bg-primary/10'
              )}
            >
              {ip} <span className="text-muted-foreground">×{n}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'graph' ? (
        <SubdomainGraph rows={visible} onPickIp={setFilter} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Host</th>
                  <th className="px-3 py-1.5 font-medium">Addresses</th>
                  <th className="px-3 py-1.5 font-medium">CNAME</th>
                  <th className="px-3 py-1.5 text-right font-medium">Cert</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((r) => (
                  <tr
                    key={r.host}
                    className={cn(
                      isDead(r) && !r.dangling && 'text-muted-foreground'
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <span className="font-mono">{r.host}</span>
                      {r.dangling && (
                        <Tag
                          tone="bad"
                          title="CNAME points at a name that does not resolve — check for subdomain takeover"
                        >
                          dangling
                        </Tag>
                      )}
                      {r.sensitive && (
                        <Tag
                          tone="warn"
                          title="Name suggests an internal, admin or pre-production surface"
                        >
                          sensitive
                        </Tag>
                      )}
                      {r.wildcard && (
                        <Tag title="Covered by a wildcard certificate">*</Tag>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-mono">
                      <Addresses entry={r} onPick={setFilter} />
                    </td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground break-all">
                      {r.dns.cname?.replace(/\.$/, '') ?? ''}
                    </td>
                    <td
                      className={cn(
                        'whitespace-nowrap px-3 py-1.5 text-right tabular-nums',
                        !r.active && 'text-muted-foreground'
                      )}
                      title={
                        r.firstSeen
                          ? `First seen ${r.firstSeen.slice(0, 10)}`
                          : undefined
                      }
                    >
                      {r.lastExpiry
                        ? `${r.active ? '' : 'expired '}${r.lastExpiry.slice(0, 7)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nothing matches.
              </p>
            )}
          </div>

          {visible.length > PAGE && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show fewer' : `Show all ${visible.length}`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function Addresses({
  entry,
  onPick
}: {
  entry: SubdomainEntry;
  onPick: (ip: string) => void;
}) {
  const { status, ips } = entry.dns;
  if (status !== 'resolved') {
    return (
      <span className="text-muted-foreground">
        {
          {
            nxdomain: 'NXDOMAIN',
            noanswer: 'no address',
            error: 'lookup failed',
            skipped: 'not checked'
          }[status]
        }
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {ips.map((ip) => (
        <IpChip
          key={ip}
          ip={ip}
          actions={
            <button
              type="button"
              onClick={() => onPick(ip)}
              className="text-primary hover:underline"
            >
              Filter to this IP
            </button>
          }
        />
      ))}
    </span>
  );
}

function Tag({
  children,
  tone,
  title
}: {
  children: ReactNode;
  tone?: 'warn' | 'bad';
  title: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'ml-1.5 rounded px-1 py-px align-middle text-[10px] font-medium',
        tone === 'bad'
          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
          : tone === 'warn'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            : 'bg-muted text-muted-foreground'
      )}
    >
      {children}
    </span>
  );
}
