'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Info,
  Landmark,
  RotateCw,
  ShieldCheck,
  X
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { HapticTabsTrigger as TabsTrigger } from '@/components/haptic-wrappers';
import { StatusAnnouncer } from '@/components/status-announcer';
import { WhoisResults } from '@/components/whois-results';
import { SecurityPosture } from '@/components/osint/security-posture';
import { SiteIdentity } from '@/components/osint/site-identity';
import { ThreatHistory } from '@/components/osint/threat-history';
import { RedirectChain } from '@/components/osint/redirect-chain';
import { SubdomainTable, isDangling } from '@/components/osint/subdomain-table';
import { useSource, type Source } from '@/components/osint/use-source';
import {
  AsnChip,
  IpChip,
  matchProvider,
  Pill,
  ProviderPill,
  StatusPill,
  uniqueProviders
} from '@/components/osint/pills';
import { SeoPanel } from '@/components/osint/seo-panel';
import type { SeoData } from '@/lib/seo';
import { useHaptics } from '@/hooks/use-haptics';
import { detectQueryType } from '@/lib/rdap';
import { isSensitiveHost } from '@/lib/subdomains';
import { cn } from '@/lib/utils';
import type {
  CertificateData,
  CookieInfo,
  EmailSecurityResult,
  IdentityData,
  RedirectHop,
  SecurityData,
  SocialTagsResult,
  TechStackResult,
  ThreatData,
  WAFResult
} from '@/lib/osint-types';
import type { IPResponse } from '@/types/ip';
import type { WhoisFallbackResult } from '@/lib/whois';

type Tab =
  | 'subdomains'
  | 'dns'
  | 'web'
  | 'seo'
  | 'security'
  | 'identity'
  | 'threat'
  | 'whois';

interface DnsData {
  records?: Record<string, string[]>;
  emailSecurity?: EmailSecurityResult | null;
}

interface HttpData {
  ok: boolean;
  status: number;
  url: string;
  redirected?: boolean;
  title?: string;
  headers?: Record<string, string>;
  securityHeaders?: Record<string, string>;
  redirectChain?: RedirectHop[];
  waf?: WAFResult | null;
  techStack?: TechStackResult | null;
  socialTags?: SocialTagsResult | null;
  cookies?: CookieInfo[] | null;
  seo?: SeoData | null;
}

interface RdapLike {
  _source?: string;
  name?: string;
  handle?: string;
  events?: Array<{ eventAction?: string; eventDate?: string }>;
  entities?: Array<{
    roles?: string[];
    vcardArray?: [string, Array<[string, unknown, string, unknown]>];
  }>;
}
type RdapData = RdapLike | WhoisFallbackResult;

const DAY = 86_400_000;

const SECURITY_HEADERS = [
  ['strict-transport-security', 'HSTS'],
  ['content-security-policy', 'CSP'],
  ['x-frame-options', 'X-Frame-Options'],
  ['x-content-type-options', 'X-Content-Type-Options'],
  ['referrer-policy', 'Referrer-Policy'],
  ['permissions-policy', 'Permissions-Policy']
] as const;

export function OsintResults({
  query,
  actions
}: {
  query: string;
  actions?: ReactNode;
}) {
  const type = detectQueryType(query);
  const isDomain = type === 'domain';
  const isHost = isDomain || type === 'ipv4' || type === 'ipv6';
  const q = encodeURIComponent(query);

  const tabs: Tab[] = isDomain
    ? [
        'subdomains',
        'dns',
        'web',
        'seo',
        'security',
        'identity',
        'threat',
        'whois'
      ]
    : isHost
      ? ['web', 'seo', 'security', 'threat', 'whois']
      : ['whois'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(
    () => new Set([tabs[0]])
  );
  const open = (t: Tab) => {
    setTab(t);
    setOpened((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
  };

  // Eager: these feed the summary.
  const rdap = useSource<RdapData>(`/api/whois?query=${q}`, 'WHOIS lookup');
  const ip = useSource<IPResponse>(
    isHost ? `/api/ip?target=${q}&details=true` : null,
    'IP lookup'
  );
  const dns = useSource<DnsData>(
    isDomain ? `/api/osint/dns?target=${q}` : null,
    'DNS lookup'
  );
  const http = useSource<HttpData>(
    isHost ? `/api/osint/http?target=${q}` : null,
    'HTTP probe'
  );
  const certs = useSource<CertificateData>(
    isDomain ? `/api/osint/certificates?target=${q}` : null,
    'Subdomain scan',
    45000
  );
  const security = useSource<SecurityData>(
    isHost ? `/api/osint/security?target=${q}` : null,
    'Security checks'
  );
  // Lazy: fetched the first time their tab is opened.
  const identity = useSource<IdentityData>(
    isDomain && opened.has('identity')
      ? `/api/osint/identity?target=${q}`
      : null,
    'security.txt lookup'
  );
  const threat = useSource<ThreatData>(
    isHost && opened.has('threat') ? `/api/osint/threat?target=${q}` : null,
    'Threat lookup'
  );

  const busy = [rdap, ip, dns, http, certs, security].some((s) => s.loading);
  const { trigger } = useHaptics();
  useEffect(() => {
    if (!busy) trigger('success');
  }, [busy, trigger]);

  const reg = rdapFacts(rdap.data);
  const insights = buildInsights({
    reg,
    ip: ip.data,
    http: http.data,
    dns: dns.data,
    security: security.data,
    certs: certs.data,
    threat: threat.data
  });

  const tabState: Record<Tab, Source<unknown>> = {
    subdomains: certs,
    dns,
    web: http,
    seo: http,
    security,
    identity,
    threat,
    whois: rdap
  };

  return (
    <div className="space-y-4">
      <StatusAnnouncer
        message={busy ? `Scanning ${query}` : `Scan of ${query} complete`}
      />

      <Card className="gap-0 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-lg font-semibold break-all">{query}</h2>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {type}
          </span>
          {busy && (
            <span className="text-xs text-muted-foreground">scanning…</span>
          )}
          <div className="ml-auto">{actions}</div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {isDomain ? (
            <>
              <Fact
                label="Registrar"
                src={rdap}
                value={
                  reg.registrar && (
                    <ProviderPill
                      label={reg.registrar}
                      domain={matchProvider(reg.registrar)?.domain ?? null}
                      fallback={<Landmark className="h-3 w-3" />}
                    />
                  )
                }
              />
              <Fact
                label="Registered"
                src={rdap}
                value={fmtDate(reg.created)}
              />
              <Fact label="Expires" src={rdap} value={fmtDate(reg.expires)} />
            </>
          ) : (
            <Fact label="Network" src={rdap} value={reg.registrar} />
          )}
          {isHost && (
            <>
              <Fact
                label="Address"
                src={ip}
                value={ip.data?.ip && <IpChip ip={ip.data.ip} />}
              />
              <Fact
                label="ASN"
                src={ip}
                value={ip.data?.as && <AsnChip as={ip.data.as} />}
              />
              <Fact
                label="Location"
                src={ip}
                value={
                  ip.data?.country && (
                    <Pill icon={<span>{flag(ip.data.countryCode)}</span>}>
                      {[ip.data.city, ip.data.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Pill>
                  )
                }
              />
              <Fact
                label="Reverse DNS"
                src={ip}
                value={ip.data?.reverse}
                mono
              />
              <Fact
                label="Web"
                wide
                src={http}
                value={
                  http.data && (
                    <span className="flex flex-wrap gap-1">
                      <StatusPill status={http.data.status} />
                      {uniqueProviders([
                        http.data.headers?.server,
                        http.data.waf?.name,
                        ...(http.data.techStack?.cdn ?? []),
                        ...(http.data.techStack?.server ?? []),
                        ...(http.data.techStack?.framework ?? []),
                        ...(http.data.techStack?.cms ?? [])
                      ]).map((p) => (
                        <ProviderPill key={p.label} {...p} />
                      ))}
                    </span>
                  )
                }
              />
            </>
          )}
          {isDomain && (
            <>
              <Fact
                label="TLS issuers"
                wide
                src={certs}
                value={
                  certs.data && (
                    <span className="flex flex-wrap gap-1">
                      {certs.data.issuers.map((i) => {
                        const p = matchProvider(i.name);
                        return (
                          <ProviderPill
                            key={i.name}
                            label={`${p?.label ?? i.name} · ${i.count}`}
                            domain={p?.domain ?? null}
                            fallback={<ShieldCheck className="h-3 w-3" />}
                          />
                        );
                      })}
                    </span>
                  )
                }
              />
              <Fact
                label="Subdomains"
                src={certs}
                value={
                  certs.data &&
                  `${certs.data.subdomains.length} found · ${certs.data.subdomains.filter((s) => s.dns.status === 'resolved').length} live`
                }
              />
            </>
          )}
        </dl>

        {insights.length > 0 && (
          <ul
            className="mt-3 flex flex-wrap gap-1.5 border-t pt-3"
            aria-label="Findings"
          >
            {insights.map((i) => (
              <li key={i.text}>
                <button
                  type="button"
                  disabled={!i.tab || !tabs.includes(i.tab)}
                  onClick={() => i.tab && open(i.tab)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs enabled:hover:brightness-95',
                    TONE[i.tone]
                  )}
                >
                  <ToneIcon tone={i.tone} />
                  {i.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Tabs value={tab} onValueChange={(v) => open(v as Tab)}>
        <div className="overflow-x-auto">
          <TabsList className="h-9">
            {tabs.map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="gap-1.5 px-3 text-xs capitalize"
              >
                {t === 'whois'
                  ? 'WHOIS'
                  : t === 'dns' || t === 'seo'
                    ? t.toUpperCase()
                    : t}
                <TabStatus
                  source={tabState[t]}
                  count={
                    t === 'subdomains'
                      ? certs.data?.subdomains.length
                      : undefined
                  }
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="subdomains">
          <Panel src={certs} rows={8}>
            {(d) => <SubdomainTable data={d} />}
          </Panel>
        </TabsContent>
        <TabsContent value="dns">
          <Panel src={dns}>
            {(d) => <DnsTable records={d.records ?? {}} />}
          </Panel>
        </TabsContent>
        <TabsContent value="web">
          <Panel src={http}>{(d) => <WebPanel data={d} />}</Panel>
        </TabsContent>
        <TabsContent value="security">
          <Card className="p-4">
            <SecurityPosture
              securityData={security.data}
              emailSecurity={dns.data?.emailSecurity ?? null}
              waf={http.data?.waf ?? null}
              pending={security.loading}
              error={security.error ?? undefined}
            />
            {security.error && <RetryButton onClick={security.retry} />}
          </Card>
        </TabsContent>
        <TabsContent value="seo">
          <Panel src={http}>
            {(d) =>
              d.seo ? (
                <SeoPanel seo={d.seo} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No HTML page to analyse.
                </p>
              )
            }
          </Panel>
        </TabsContent>
        <TabsContent value="identity">
          <Card className="p-4">
            <SiteIdentity
              techStack={http.data?.techStack ?? null}
              cookies={http.data?.cookies ?? null}
              identityData={identity.data}
              pending={identity.loading}
              error={identity.error ?? undefined}
            />
            {identity.error && <RetryButton onClick={identity.retry} />}
          </Card>
        </TabsContent>
        <TabsContent value="threat">
          <Card className="p-4">
            <ThreatHistory
              threatData={threat.data}
              pending={threat.loading}
              error={threat.error ?? undefined}
            />
            {threat.error && <RetryButton onClick={threat.retry} />}
          </Card>
        </TabsContent>
        <TabsContent value="whois">
          {rdap.data ? (
            <WhoisResults
              data={rdap.data as Record<string, unknown>}
              query={query}
            />
          ) : (
            <Panel src={rdap}>{() => null}</Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- summary pieces ---------- */

function Fact({
  label,
  src,
  value,
  mono,
  wide
}: {
  label: string;
  src: Source<unknown>;
  value: ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm break-words',
          mono && 'font-mono text-xs leading-5 break-all'
        )}
      >
        {src.loading ? (
          <Skeleton className="mt-1 h-4 w-24" />
        ) : src.error ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {src.error}
          </span>
        ) : (
          value || <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}

type Tone = 'good' | 'info' | 'warn' | 'bad';
interface Insight {
  tone: Tone;
  text: string;
  tab?: Tab;
}

const TONE: Record<Tone, string> = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  info: 'border-border bg-muted/50 text-muted-foreground',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
};

function ToneIcon({ tone }: { tone: Tone }) {
  const cls = 'h-3 w-3';
  if (tone === 'good') return <Check className={cls} />;
  if (tone === 'bad') return <CircleAlert className={cls} />;
  if (tone === 'warn') return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function buildInsights(d: {
  reg: ReturnType<typeof rdapFacts>;
  ip: IPResponse | null;
  http: HttpData | null;
  dns: DnsData | null;
  security: SecurityData | null;
  certs: CertificateData | null;
  threat: ThreatData | null;
}): Insight[] {
  const out: Insight[] = [];
  const now = Date.now();

  const expires = Date.parse(d.reg.expires ?? '');
  if (!isNaN(expires)) {
    const days = Math.round((expires - now) / DAY);
    if (days < 0)
      out.push({
        tone: 'bad',
        text: 'Domain registration expired',
        tab: 'whois'
      });
    else if (days < 30)
      out.push({
        tone: 'bad',
        text: `Domain expires in ${days}d`,
        tab: 'whois'
      });
    else if (days < 90)
      out.push({
        tone: 'warn',
        text: `Domain expires in ${days}d`,
        tab: 'whois'
      });
  }
  const created = Date.parse(d.reg.created ?? '');
  if (!isNaN(created) && now - created < 180 * DAY) {
    out.push({
      tone: 'warn',
      text: `Registered ${Math.round((now - created) / DAY)}d ago`,
      tab: 'whois'
    });
  }

  if (d.certs) {
    const target = d.certs.target;
    const dangling = d.certs.subdomains.filter(isDangling).length;
    const sensitive = d.certs.subdomains.filter(
      (s) => s.dns.status === 'resolved' && isSensitiveHost(s.host, target)
    ).length;
    if (dangling)
      out.push({
        tone: 'bad',
        text: `${dangling} dangling CNAME${dangling > 1 ? 's' : ''}`,
        tab: 'subdomains'
      });
    if (sensitive)
      out.push({
        tone: 'warn',
        text: `${sensitive} sensitive-looking host${sensitive > 1 ? 's' : ''} live`,
        tab: 'subdomains'
      });
  }

  if (d.http) {
    if (d.http.url.startsWith('http:'))
      out.push({ tone: 'bad', text: 'No HTTPS', tab: 'web' });
    else if (!d.http.ok)
      out.push({
        tone: 'warn',
        text: `Site answers HTTP ${d.http.status}`,
        tab: 'web'
      });
    const sec = lowerKeys(d.http.securityHeaders);
    if (d.http.ok) {
      out.push(
        sec['strict-transport-security']
          ? { tone: 'good', text: 'HSTS', tab: 'web' }
          : { tone: 'warn', text: 'No HSTS', tab: 'web' }
      );
      if (!sec['content-security-policy'])
        out.push({ tone: 'info', text: 'No CSP', tab: 'web' });
    }
    if (d.http.waf?.detected && d.http.waf.name)
      out.push({
        tone: 'info',
        text: `Behind ${d.http.waf.name}`,
        tab: 'security'
      });
  }

  const email = d.dns?.emailSecurity;
  if (email) {
    if (!email.spf.record)
      out.push({ tone: 'warn', text: 'No SPF', tab: 'security' });
    else if (email.spf.policy === 'pass')
      out.push({
        tone: 'bad',
        text: 'SPF +all allows anyone',
        tab: 'security'
      });
    if (!email.dmarc.record)
      out.push({ tone: 'warn', text: 'No DMARC', tab: 'security' });
    else if (email.dmarc.policy === 'none')
      out.push({ tone: 'warn', text: 'DMARC p=none', tab: 'security' });
    else
      out.push({
        tone: 'good',
        text: `DMARC ${email.dmarc.policy}`,
        tab: 'security'
      });
  }

  if (d.security) {
    const listed = d.security.blocklist.results.filter((r) => r.listed);
    if (listed.length)
      out.push({
        tone: 'bad',
        text: `Listed on ${listed.map((r) => r.name).join(', ')}`,
        tab: 'security'
      });
    if (d.security.dnssec.enabled)
      out.push({ tone: 'good', text: 'DNSSEC', tab: 'security' });
  }

  if (d.ip?.proxy)
    out.push({ tone: 'warn', text: 'Proxy / VPN address', tab: 'web' });

  if (d.threat) {
    const vulns = d.threat.shodan.reduce((n, h) => n + h.vulns.length, 0);
    if (vulns)
      out.push({
        tone: 'bad',
        text: `${vulns} known CVE${vulns > 1 ? 's' : ''} on exposed services`,
        tab: 'threat'
      });
  }

  const order: Record<Tone, number> = { bad: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

function rdapFacts(d: RdapData | null): {
  registrar: string | null;
  created: string | null;
  expires: string | null;
} {
  if (!d) return { registrar: null, created: null, expires: null };
  if ('parsedWhois' in d) {
    const p = d.parsedWhois;
    return {
      registrar: p.registrar,
      created: p.creationDate,
      expires: p.expirationDate
    };
  }
  const event = (action: string) =>
    d.events?.find((e) => e.eventAction === action)?.eventDate ?? null;
  const registrar = d.entities
    ?.find((e) => e.roles?.includes('registrar'))
    ?.vcardArray?.[1]?.find((f) => f[0] === 'fn')?.[3];
  return {
    registrar:
      typeof registrar === 'string' ? registrar : (d.name ?? d.handle ?? null),
    created: event('registration'),
    expires: event('expiration')
  };
}

/* ---------- tab pieces ---------- */

function TabStatus({
  source,
  count
}: {
  source: Source<unknown>;
  count?: number;
}) {
  if (source.loading)
    return (
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
        aria-label="loading"
      />
    );
  if (source.error)
    return <X className="h-3 w-3 text-red-500" aria-label="failed" />;
  if (count !== undefined)
    return <span className="tabular-nums text-muted-foreground">{count}</span>;
  return null;
}

function Panel<T>({
  src,
  rows = 4,
  children
}: {
  src: Source<T>;
  rows?: number;
  children: (d: T) => ReactNode;
}) {
  return (
    <Card className="p-4">
      {src.data ? (
        children(src.data)
      ) : src.error ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>{src.error}</span>
          <RetryButton onClick={src.retry} />
        </div>
      ) : src.loading ? (
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not available for this query.
        </p>
      )}
    </Card>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-auto h-7 gap-1.5 text-xs"
      onClick={onClick}
    >
      <RotateCw className="h-3 w-3" /> Retry
    </Button>
  );
}

const DNS_ORDER = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'];

function DnsTable({ records }: { records: Record<string, string[]> }) {
  const present = DNS_ORDER.filter((t) => records[t]?.length);
  const missing = DNS_ORDER.filter((t) => !records[t]?.length);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody className="divide-y">
            {present.map((t) => (
              <tr key={t} className="align-top">
                <th
                  scope="row"
                  className="w-16 py-1.5 pr-3 text-left font-medium text-muted-foreground"
                >
                  {t}
                </th>
                <td className="py-1.5 font-mono">
                  {records[t].map((v) => (
                    <div key={v} className="break-all">
                      {v}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No {missing.join(', ')} records.
        </p>
      )}
    </div>
  );
}

function WebPanel({ data }: { data: HttpData }) {
  const sec = lowerKeys(data.securityHeaders);
  const headers = Object.entries(data.headers ?? {});
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-xs',
              data.ok
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            )}
          >
            {data.status}
          </span>
          <span className="break-all font-mono text-xs">{data.url}</span>
        </div>
        {data.title && <p className="text-muted-foreground">{data.title}</p>}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Security headers
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {SECURITY_HEADERS.map(([key, label]) => (
            <li
              key={key}
              className="flex items-center gap-1.5"
              title={sec[key] ?? 'Not set'}
            >
              {sec[key] ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <X className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(!sec[key] && 'text-muted-foreground')}>
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {(data.redirectChain?.length ?? 0) > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Redirects
          </p>
          <RedirectChain chain={data.redirectChain ?? []} />
        </div>
      )}

      {headers.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Response headers ({headers.length})
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y">
                {headers.map(([k, v]) => (
                  <tr key={k} className="align-top">
                    <th
                      scope="row"
                      className="py-1 pr-3 text-left font-normal whitespace-nowrap text-muted-foreground"
                    >
                      {k}
                    </th>
                    <td className="py-1 font-mono break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

/* ---------- utils ---------- */

/** ISO 3166 alpha-2 code to its flag emoji. */
function flag(cc: string | undefined) {
  return cc && /^[a-z]{2}$/i.test(cc)
    ? cc
        .toUpperCase()
        .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : '';
}

function lowerKeys(
  o: Record<string, string> | undefined
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(o ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
}

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return isNaN(t) ? s : new Date(t).toISOString().slice(0, 10);
}
