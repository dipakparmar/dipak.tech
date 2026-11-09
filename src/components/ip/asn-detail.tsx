'use client';

import { useMemo, useState } from 'react';
import { Network, Search, Waypoints, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AsnChip, Pill } from '@/components/osint/pills';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { normalizePathname } from '@/lib/host-routing';
import {
  compactCount,
  ipv4AddressCount,
  lengthHistogram,
  prefixSortKey
} from '@/lib/asn-stats';
import { cn } from '@/lib/utils';
import type { ASNDetail } from '@/types/network';

/** Prefixes rendered before "show all". */
const PREFIX_PAGE = 150;

function lookupHref(target: string) {
  const host = typeof window === 'undefined' ? '' : window.location.host;
  return `${normalizePathname('tools', '/tools/ip', host)}?target=${encodeURIComponent(target)}`;
}

export function ASNSummary({ detail: d }: { detail: ASNDetail }) {
  const v4Addresses = useMemo(
    () => ipv4AddressCount(d.prefixes_v4.map((p) => p.prefix)),
    [d.prefixes_v4]
  );
  return (
    <Card className="mb-4 gap-2 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-mono text-2xl font-bold">AS{d.asn}</h2>
        <span className="text-sm">{d.name}</span>
        {d.description && d.description !== d.name && (
          <span className="text-xs text-muted-foreground">{d.description}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {d.rir && <Pill>{d.rir}</Pill>}
        {d.country && <Pill>{d.country}</Pill>}
        <Pill tone="info">
          {d.prefixes_v4.length.toLocaleString()} IPv4 prefixes
        </Pill>
        <Pill tone="info">
          {d.prefixes_v6.length.toLocaleString()} IPv6 prefixes
        </Pill>
        {v4Addresses > 0 && (
          <Pill
            title={`${v4Addresses.toLocaleString()} distinct IPv4 addresses (overlapping prefixes counted once)`}
          >
            ≈{compactCount(v4Addresses)} IPv4 addresses
          </Pill>
        )}
        <Pill>
          {d.peers_count.toLocaleString()} peers · {d.upstreams.length} upstream
          · {d.downstreams.length} downstream
        </Pill>
      </div>
    </Card>
  );
}

export function ASNPrefixes({ detail: d }: { detail: ASNDetail }) {
  const [family, setFamily] = useState<'v4' | 'v6'>(
    d.prefixes_v4.length || !d.prefixes_v6.length ? 'v4' : 'v6'
  );
  const [filter, setFilter] = useState('');
  const [length, setLength] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const all = useMemo(
    () =>
      (family === 'v4' ? d.prefixes_v4 : d.prefixes_v6)
        .slice()
        .sort((a, b) =>
          prefixSortKey(a.prefix).localeCompare(prefixSortKey(b.prefix))
        ),
    [d, family]
  );
  const histogram = useMemo(
    () => lengthHistogram(all.map((p) => p.prefix)),
    [all]
  );

  const needle = filter.trim().toLowerCase();
  const visible = all.filter(
    (p) =>
      (!length || p.prefix.endsWith(length)) &&
      (!needle ||
        p.prefix.includes(needle) ||
        p.name?.toLowerCase().includes(needle))
  );
  const shown = showAll ? visible : visible.slice(0, PREFIX_PAGE);

  return (
    <Card className="mb-4 gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Network className="h-4 w-4 text-green-500" />
          Announced prefixes
        </span>
        <div
          className="flex rounded-md border p-0.5"
          role="group"
          aria-label="Address family"
        >
          {(
            [
              ['v4', `IPv4 ${d.prefixes_v4.length}`],
              ['v6', `IPv6 ${d.prefixes_v6.length}`]
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={family === f}
              onClick={() => {
                setFamily(f);
                setLength(null);
              }}
              className={cn(
                'rounded px-2 py-1 text-xs text-muted-foreground',
                family === f && 'bg-muted font-medium text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-40 flex-1">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter prefixes"
            aria-label="Filter prefixes"
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => copy(visible.map((p) => p.prefix).join('\n'))}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy {visible.length}
        </Button>
      </div>

      {histogram.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted-foreground">By length</span>
          {histogram.map(([len, n]) => (
            <button
              key={len}
              type="button"
              onClick={() => setLength(length === len ? null : len)}
              aria-pressed={length === len}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono hover:bg-muted',
                length === len && 'border-primary bg-primary/10'
              )}
            >
              {len} <span className="text-muted-foreground">×{n}</span>
            </button>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {family === 'v4' ? 'IPv4' : 'IPv6'} prefixes announced.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
          {shown.map((p) => (
            <a
              key={p.prefix}
              href={lookupHref(p.prefix)}
              className="hover:text-primary hover:underline"
              title={
                p.name
                  ? `${p.name} — look up this prefix`
                  : 'Look up this prefix'
              }
            >
              {p.prefix}
              {p.name && (
                <span className="text-muted-foreground"> {p.name}</span>
              )}
            </a>
          ))}
          {visible.length === 0 && (
            <span className="font-sans text-muted-foreground">
              Nothing matches.
            </span>
          )}
        </div>
      )}

      {visible.length > PREFIX_PAGE && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show fewer' : `Show all ${visible.length} prefixes`}
        </Button>
      )}
    </Card>
  );
}

export function ASNPeers({ detail: d }: { detail: ASNDetail }) {
  return (
    <Card className="mb-4 gap-3 p-4">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <Waypoints className="h-4 w-4 text-blue-500" />
        Upstreams &amp; downstreams
        <span className="font-normal text-muted-foreground">
          · hover an ASN for its name and details
        </span>
      </span>
      <PeerList title="Upstreams" peers={d.upstreams} />
      <PeerList title="Downstreams" peers={d.downstreams} />
    </Card>
  );
}

function PeerList({
  title,
  peers
}: {
  title: string;
  peers: ASNDetail['upstreams'];
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
        {title} ({peers.length})
      </h3>
      {peers.length === 0 ? (
        <p className="text-xs text-muted-foreground">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {peers.map((p, i) => (
            <AsnChip
              key={`${p.asn}-${i}`}
              as={p.name ? `AS${p.asn} ${p.name}` : `AS${p.asn}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
