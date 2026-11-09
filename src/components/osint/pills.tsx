'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Globe, Network, Server } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useSource } from '@/components/osint/use-source';
import { getDomainLogoSrc } from '@/lib/provider-logos';
import { normalizePathname } from '@/lib/host-routing';
import { cn } from '@/lib/utils';
import type { IPResponse } from '@/types/ip';

/* ---------- providers ---------- */

// ponytail: substring match on server/CDN/issuer names; add rows as new providers show up.
// More specific patterns first (Google Trust Services before Google).
const PROVIDERS: Array<[RegExp, string, string]> = [
  [/google trust|gts ca/i, 'Google Trust Services', 'pki.goog'],
  [/cloudflare/i, 'Cloudflare', 'cloudflare.com'],
  [/cloudfront|amazon|aws|awselb|\bs3\b/i, 'AWS', 'aws.amazon.com'],
  [/akamai/i, 'Akamai', 'akamai.com'],
  [/fastly|varnish/i, 'Fastly', 'fastly.com'],
  [/vercel/i, 'Vercel', 'vercel.com'],
  [/netlify/i, 'Netlify', 'netlify.com'],
  [/github/i, 'GitHub', 'github.com'],
  [/\bgws\b|\bgfe\b|\besf\b|google/i, 'Google', 'google.com'],
  [/microsoft|azure|\biis\b/i, 'Microsoft', 'microsoft.com'],
  [/sucuri/i, 'Sucuri', 'sucuri.net'],
  [/imperva|incapsula/i, 'Imperva', 'imperva.com'],
  [/bunny/i, 'Bunny', 'bunny.net'],
  [/openresty/i, 'OpenResty', 'openresty.org'],
  [/nginx/i, 'nginx', 'nginx.org'],
  [/apache/i, 'Apache', 'apache.org'],
  [/caddy/i, 'Caddy', 'caddyserver.com'],
  [/litespeed/i, 'LiteSpeed', 'litespeedtech.com'],
  [/envoy/i, 'Envoy', 'envoyproxy.io'],
  [/let'?s ?encrypt/i, "Let's Encrypt", 'letsencrypt.org'],
  [/digicert/i, 'DigiCert', 'digicert.com'],
  [/sectigo|comodo/i, 'Sectigo', 'sectigo.com'],
  [/globalsign/i, 'GlobalSign', 'globalsign.com'],
  [/zerossl/i, 'ZeroSSL', 'zerossl.com'],
  [/godaddy/i, 'GoDaddy', 'godaddy.com'],
  [/entrust/i, 'Entrust', 'entrust.com'],
  [/next\.?js/i, 'Next.js', 'nextjs.org'],
  [/\breact\b/i, 'React', 'react.dev'],
  [/wordpress/i, 'WordPress', 'wordpress.org'],
  [/shopify/i, 'Shopify', 'shopify.com'],
  [/squarespace/i, 'Squarespace', 'squarespace.com'],
  [/wix/i, 'Wix', 'wix.com'],
  [/webflow/i, 'Webflow', 'webflow.com'],
  [/markmonitor/i, 'MarkMonitor', 'markmonitor.com'],
  [/namecheap/i, 'Namecheap', 'namecheap.com'],
  [/gandi/i, 'Gandi', 'gandi.net']
];

export function matchProvider(name: string) {
  const hit = PROVIDERS.find(([re]) => re.test(name));
  return hit ? { label: hit[1], domain: hit[2] } : null;
}

/** Collapse "cloudflare" + "Cloudflare" (header + WAF) into one pill. */
export function uniqueProviders(names: Array<string | null | undefined>) {
  const seen = new Map<string, { label: string; domain: string | null }>();
  for (const raw of names) {
    const name = raw?.trim();
    if (!name) continue;
    const p = matchProvider(name);
    const key = (p?.label ?? name).toLowerCase();
    if (!seen.has(key))
      seen.set(key, { label: p?.label ?? name, domain: p?.domain ?? null });
  }
  return [...seen.values()];
}

/* ---------- pills ---------- */

const TONES = {
  neutral: 'border-border bg-muted/40',
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
};

export function Pill({
  children,
  tone = 'neutral',
  icon,
  mono,
  title
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  mono?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
        mono && 'font-mono',
        TONES[tone]
      )}
    >
      {icon}
      <span className="break-all">{children}</span>
    </span>
  );
}

export function StatusPill({ status }: { status: number }) {
  const tone =
    status < 300
      ? 'good'
      : status < 400
        ? 'info'
        : status < 500
          ? 'warn'
          : 'bad';
  return (
    <Pill tone={tone} mono title={`HTTP ${status}`}>
      {status}
    </Pill>
  );
}

export function ProviderPill({
  label,
  domain,
  fallback = <Server className="h-3 w-3" />
}: {
  label: string;
  domain: string | null;
  fallback?: ReactNode;
}) {
  return (
    <Pill icon={<Logo domain={domain} fallback={fallback} />}>{label}</Pill>
  );
}

function Logo({
  domain,
  fallback
}: {
  domain: string | null;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const src = domain ? getDomainLogoSrc(domain) : null;
  if (!src || failed)
    return <span className="text-muted-foreground">{fallback}</span>;
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- tiny third-party logo
    <img
      src={src}
      alt=""
      width={14}
      height={14}
      className="h-3.5 w-3.5 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/* ---------- hover cards with lazy details ---------- */

function HoverCard({
  trigger,
  children
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const later = (next: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={() => later(true, 250)}
        onMouseLeave={() => later(false, 150)}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 gap-2"
        onMouseEnter={() => clearTimeout(timer.current)}
        onMouseLeave={() => later(false, 150)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {open && children}
      </PopoverContent>
    </Popover>
  );
}

function toolHref(target: string) {
  const path = normalizePathname('tools', '/tools/ip', window.location.host);
  return `${path}?target=${encodeURIComponent(target)}`;
}

function ToolLink({ target }: { target: string }) {
  return (
    <a
      href={toolHref(target)}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      Open in IP tool <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

const chipClass =
  'inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs hover:border-primary/50 hover:bg-muted';

export function IpChip({ ip, actions }: { ip: string; actions?: ReactNode }) {
  return (
    <HoverCard
      trigger={
        <button type="button" className={chipClass}>
          <Globe className="h-3 w-3 text-muted-foreground" />
          {ip}
        </button>
      }
    >
      <IpDetails ip={ip} />
      <div className="flex flex-wrap items-center gap-3 border-t pt-2">
        <ToolLink target={ip} />
        {actions}
      </div>
    </HoverCard>
  );
}

function IpDetails({ ip }: { ip: string }) {
  const src = useSource<IPResponse>(
    `/api/ip?target=${encodeURIComponent(ip)}&details=true`,
    'IP lookup'
  );
  if (src.loading) return <CardSkeleton />;
  if (src.error)
    return <p className="text-amber-700 dark:text-amber-400">{src.error}</p>;
  const d = src.data;
  if (!d) return null;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-sm font-medium">{d.ip ?? ip}</span>
        {d.hosting && <Pill>hosting</Pill>}
        {d.proxy && <Pill tone="warn">proxy</Pill>}
        {d.mobile && <Pill>mobile</Pill>}
      </div>
      <Row label="Location">
        {[d.city, d.regionName, d.country].filter(Boolean).join(', ')}
      </Row>
      <Row label="ASN">{d.as}</Row>
      <Row label="ISP">{d.isp}</Row>
      <Row label="Org">{d.org !== d.isp ? d.org : null}</Row>
      <Row label="Reverse">
        {d.reverse && <span className="font-mono">{d.reverse}</span>}
      </Row>
      <Row label="Timezone">{d.timezone}</Row>
    </div>
  );
}

export function AsnChip({ as }: { as: string }) {
  const num = as.match(/AS(\d+)/i)?.[1];
  if (!num) return <span>{as}</span>;
  return (
    <HoverCard
      trigger={
        <button type="button" className={cn(chipClass, 'font-sans')}>
          <Network className="h-3 w-3 text-muted-foreground" />
          {as}
        </button>
      }
    >
      <AsnDetails asn={num} />
      <div className="border-t pt-2">
        <ToolLink target={`AS${num}`} />
      </div>
    </HoverCard>
  );
}

interface NetworkResponse {
  asn_detail?: {
    asn: string;
    name?: string;
    description?: string;
    country?: string;
    rir?: string;
    prefixes_v4?: unknown[];
    prefixes_v6?: unknown[];
  };
}

function AsnDetails({ asn }: { asn: string }) {
  const src = useSource<NetworkResponse>(
    `/api/ip/network?query=AS${asn}`,
    'ASN lookup'
  );
  if (src.loading) return <CardSkeleton />;
  if (src.error)
    return <p className="text-amber-700 dark:text-amber-400">{src.error}</p>;
  const d = src.data?.asn_detail;
  if (!d)
    return <p className="text-muted-foreground">No details for AS{asn}.</p>;
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">
        AS{d.asn}{' '}
        <span className="font-normal">
          {d.name?.replace(/^AS\d+\s*-\s*/i, '')}
        </span>
      </div>
      <Row label="Country">{d.country}</Row>
      <Row label="Registry">{d.rir}</Row>
      <Row label="Note">{d.description}</Row>
      <Row label="Prefixes">
        {d.prefixes_v4 || d.prefixes_v6
          ? `${d.prefixes_v4?.length ?? 0} IPv4 · ${d.prefixes_v6?.length ?? 0} IPv6`
          : null}
      </Row>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
