'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SubdomainEntry } from '@/lib/osint-types';
import { cn } from '@/lib/utils';

const ROW = 22;
/** Advance width of one 11px monospace glyph; column widths come from label lengths. */
const CHAR_W = 6.7;
const EDGE_GAP = 140;
const MAX_HOSTS = 150;

interface Node {
  id: string;
  label: string;
  col: 0 | 1 | 2;
  y: number;
  bad: boolean;
}
interface Edge {
  from: string;
  to: string;
  bad: boolean;
}

/**
 * Layered host → CNAME → IP diagram. Rows are ordered by the average position
 * of the IPs they reach (barycentre), which keeps most edges from crossing.
 */
export function SubdomainGraph({
  rows,
  onPickIp
}: {
  rows: SubdomainEntry[];
  onPickIp: (ip: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const graph = useMemo(() => layout(rows, showAll), [rows, showAll]);
  const { X, width } = graph;
  const [hover, setHover] = useState<string | null>(null);
  const lit = useMemo(
    () => (hover ? chain(hover, graph.edges) : null),
    [hover, graph.edges]
  );

  if (graph.nodes.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        None of these hosts resolve, so there is nothing to draw.
      </p>
    );
  }

  const pos = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <svg
          width={width}
          height={graph.height + ROW * 1.5}
          className="select-none"
          role="img"
          aria-label={`${graph.hostCount} hosts, ${graph.cnameCount} CNAME targets and ${graph.ipCount} IP addresses`}
        >
          <g className="fill-muted-foreground text-[11px] font-medium">
            <text x={X[0]} y={14} textAnchor="end">
              Hosts {graph.hostCount}
            </text>
            {graph.cnameCount > 0 && (
              <text x={X[1]} y={14}>
                CNAME targets {graph.cnameCount}
              </text>
            )}
            <text x={X[2]} y={14}>
              IPs {graph.ipCount}
            </text>
          </g>
          <g transform={`translate(0 ${ROW * 1.25})`}>
            <g fill="none">
              {graph.edges.map((e) => {
                const a = pos.get(e.from)!;
                const b = pos.get(e.to)!;
                const mid = (X[a.col] + X[b.col]) / 2;
                const on = lit?.has(e.from) && lit.has(e.to);
                return (
                  <path
                    key={`${e.from}>${e.to}`}
                    d={`M${X[a.col]} ${a.y}C${mid} ${a.y} ${mid} ${b.y} ${X[b.col]} ${b.y}`}
                    strokeWidth={on ? 1.75 : 1}
                    strokeDasharray={e.bad ? '4 3' : undefined}
                    className={cn(
                      'transition-opacity',
                      e.bad
                        ? 'stroke-red-500'
                        : on
                          ? 'stroke-primary'
                          : 'stroke-muted-foreground',
                      lit && !on
                        ? 'opacity-10'
                        : on
                          ? 'opacity-100'
                          : 'opacity-35'
                    )}
                  />
                );
              })}
            </g>
            {graph.nodes.map((n) => {
              const dim = lit && !lit.has(n.id);
              const isIp = n.col === 2;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={isIp ? () => onPickIp(n.label) : undefined}
                  className={cn(
                    'transition-opacity',
                    dim && 'opacity-25',
                    isIp && 'cursor-pointer'
                  )}
                >
                  <title>
                    {isIp ? `${n.label} — click to filter` : n.label}
                  </title>
                  {/* wide invisible hit area so the row is easy to hover */}
                  <rect
                    x={
                      n.col === 0
                        ? X[0] - n.label.length * CHAR_W - 10
                        : X[n.col] - 6
                    }
                    y={n.y - ROW / 2}
                    width={n.label.length * CHAR_W + 16}
                    height={ROW}
                    className="fill-transparent"
                  />
                  <circle
                    cx={X[n.col]}
                    cy={n.y}
                    r={3.5}
                    className={
                      n.bad
                        ? 'fill-red-500'
                        : isIp
                          ? 'fill-primary'
                          : 'fill-foreground'
                    }
                  />
                  <text
                    x={X[n.col] + (n.col === 0 ? -8 : 8)}
                    y={n.y}
                    dy="0.35em"
                    textAnchor={n.col === 0 ? 'end' : 'start'}
                    paintOrder="stroke"
                    className={cn(
                      'stroke-background font-mono text-[11px] [stroke-width:3px]',
                      n.bad
                        ? 'fill-red-600 dark:fill-red-400'
                        : n.col === 1
                          ? 'fill-muted-foreground'
                          : 'fill-foreground'
                    )}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">
        Hover a node to trace it, click an IP to filter.
        {graph.omitted > 0 &&
          ` ${graph.omitted} hosts with no DNS answer are not drawn.`}
      </p>
      {(graph.truncated > 0 || showAll) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? `Draw only the first ${MAX_HOSTS} hosts`
            : `Draw all ${graph.hostCount + graph.truncated} hosts`}
        </Button>
      )}
    </div>
  );
}

function layout(all: SubdomainEntry[], showAll: boolean) {
  const drawable = all.filter((r) => r.dns.ips.length || r.dns.cname);
  const rows = showAll ? drawable : drawable.slice(0, MAX_HOSTS);
  const clean = (s: string) => s.replace(/\.$/, '');

  const ipDegree = new Map<string, number>();
  rows.forEach((r) =>
    r.dns.ips.forEach((ip) => ipDegree.set(ip, (ipDegree.get(ip) ?? 0) + 1))
  );
  const ips = [...ipDegree.keys()].sort(
    (a, b) =>
      ipDegree.get(b)! - ipDegree.get(a)! ||
      a.localeCompare(b, undefined, { numeric: true })
  );
  const ipRank = new Map(ips.map((ip, i) => [ip, i]));
  const bary = (list: Iterable<string>) => {
    const ranks = [...list].map((ip) => ipRank.get(ip)!);
    return ranks.length
      ? ranks.reduce((a, b) => a + b, 0) / ranks.length
      : Infinity;
  };

  const cnameIps = new Map<string, Set<string>>();
  rows.forEach((r) => {
    if (!r.dns.cname) return;
    const set = cnameIps.get(clean(r.dns.cname)) ?? new Set();
    r.dns.ips.forEach((ip) => set.add(ip));
    cnameIps.set(clean(r.dns.cname), set);
  });
  const cnames = [...cnameIps.keys()].sort(
    (a, b) => bary(cnameIps.get(a)!) - bary(cnameIps.get(b)!)
  );
  const hosts = [...rows].sort(
    (a, b) => bary(a.dns.ips) - bary(b.dns.ips) || a.host.localeCompare(b.host)
  );

  const height = Math.max(hosts.length, cnames.length, ips.length) * ROW;
  const spread = <T,>(
    list: T[],
    col: 0 | 1 | 2,
    id: (t: T) => string,
    label: (t: T) => string,
    bad: (t: T) => boolean
  ): Node[] =>
    list.map((t, i) => ({
      id: id(t),
      label: label(t),
      col,
      y: ((i + 0.5) * height) / list.length,
      bad: bad(t)
    }));

  const nodes = [
    ...spread(
      hosts,
      0,
      (r) => `h:${r.host}`,
      (r) => r.host,
      () => false
    ),
    ...spread(
      cnames,
      1,
      (c) => `c:${c}`,
      (c) => c,
      (c) => cnameIps.get(c)!.size === 0
    ),
    ...spread(
      ips,
      2,
      (ip) => `i:${ip}`,
      (ip) => ip,
      () => false
    )
  ];

  const edges = new Map<string, Edge>();
  const add = (from: string, to: string, bad = false) =>
    edges.set(`${from}>${to}`, { from, to, bad });
  rows.forEach((r) => {
    const h = `h:${r.host}`;
    if (r.dns.cname) {
      const c = `c:${clean(r.dns.cname)}`;
      add(h, c, r.dns.ips.length === 0);
      r.dns.ips.forEach((ip) => add(c, `i:${ip}`));
    } else {
      r.dns.ips.forEach((ip) => add(h, `i:${ip}`));
    }
  });

  // Size each column to its longest label so nothing is clipped.
  const longest = (list: string[]) =>
    Math.max(0, ...list.map((s) => s.length)) * CHAR_W;
  const x0 = Math.max(longest(hosts.map((h) => h.host)), 60) + 12;
  const x1 = x0 + EDGE_GAP;
  const x2 = cnames.length ? x1 + longest(cnames) + 12 + EDGE_GAP : x1;
  const X = [x0, x1, x2] as const;

  return {
    X,
    width: x2 + longest(ips) + 20,
    nodes,
    edges: [...edges.values()],
    height,
    hostCount: hosts.length,
    cnameCount: cnames.length,
    ipCount: ips.length,
    omitted: all.length - drawable.length,
    truncated: drawable.length - rows.length
  };
}

/** Everything reachable from `id` going only rightwards plus only leftwards. */
function chain(id: string, edges: Edge[]): Set<string> {
  const seen = new Set([id]);
  const walk = (start: string, dir: 'from' | 'to') => {
    const other = dir === 'from' ? 'to' : 'from';
    const queue = [start];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const e of edges) {
        if (e[dir] === cur && !seen.has(e[other])) {
          seen.add(e[other]);
          queue.push(e[other]);
        }
      }
    }
  };
  walk(id, 'from');
  walk(id, 'to');
  return seen;
}
