'use client';

import type { ReactNode } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HapticButton as Button } from '@/components/haptic-wrappers';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { WhoisFallbackResult } from '@/lib/whois';

type RdapEvent = { eventAction?: string; eventDate?: string };
type RdapLink = { href?: string; rel?: string; type?: string };
type RdapNotice = {
  title?: string;
  description?: string[];
  links?: RdapLink[];
};
type PublicId = { type?: string; identifier?: string };

type SecureDnsInfo = {
  zoneSigned?: boolean;
  delegationSigned?: boolean;
  dsData?: {
    keyTag?: string | number;
    algorithm?: string | number;
    digestType?: string | number;
    digest?: string;
  }[];
};

type NameServer = {
  ldhName?: string;
  unicodeName?: string;
  ipAddresses?: { v4?: string[]; v6?: string[] };
};

type CidrBlock = {
  v4prefix?: string;
  v6prefix?: string;
  length?: number | string;
};

type VCardValue = string | string[] | null;
type VCardEntry = [string, Record<string, unknown>, string, VCardValue];

type RdapEntity = {
  handle?: string;
  roles?: string[];
  vcardArray?: [string, VCardEntry[]];
  publicIds?: PublicId[];
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
};

type QueryType = 'domain' | 'ipv4' | 'ipv6' | 'asn';

type RdapData = {
  _queryType?: QueryType;
  _source?: string;
  objectClassName?: string;
  name?: string;
  handle?: string;
  ldhName?: string;
  type?: string;
  country?: string;
  port43?: string;
  status?: string[];
  entities?: RdapEntity[];
  events?: RdapEvent[];
  nameservers?: NameServer[];
  cidr0_cidrs?: CidrBlock[];
  startAddress?: string;
  endAddress?: string;
  parentHandle?: string;
  startAutnum?: number | string;
  endAutnum?: number | string;
  secureDNS?: SecureDnsInfo;
  notices?: RdapNotice[];
  remarks?: RdapNotice[];
  links?: RdapLink[];
  publicIds?: PublicId[];
  ipVersion?: string | number;
};

interface WhoisResultsProps {
  data: RdapData | WhoisFallbackResult;
  query: string;
}

type EppStatusInfo = { label: string; summary: string; action: string };

const EPP_STATUS_INFO: Record<string, EppStatusInfo> = {
  addperiod: {
    label: 'Add Period',
    summary: 'Grace period right after initial registration.',
    action:
      'No action needed unless you intended to cancel the new registration.'
  },
  autorenewperiod: {
    label: 'Auto Renew Period',
    summary:
      'Registry auto-renewed the domain after expiry for a limited grace period.',
    action:
      'Contact your registrar quickly if you do not want to keep or pay for the renewal.'
  },
  inactive: {
    label: 'Inactive',
    summary:
      'The domain has no active delegation data and will not resolve in DNS.',
    action:
      'Check nameserver setup or registrar verification requirements if this persists.'
  },
  ok: {
    label: 'OK',
    summary: 'Normal active status with no pending operations or restrictions.',
    action:
      'Consider transfer, update, and delete protection if you want stronger anti-hijack safeguards.'
  },
  pendingcreate: {
    label: 'Pending Create',
    summary: 'A create request exists and the registry is still processing it.',
    action:
      'Monitor the registration or contact the registrar if you did not initiate it.'
  },
  pendingdelete: {
    label: 'Pending Delete',
    summary:
      'The domain is near final deletion and will soon drop from the registry.',
    action: 'Contact your registrar immediately if you want to keep the domain.'
  },
  pendingrenew: {
    label: 'Pending Renew',
    summary: 'A renewal request has been submitted and is still processing.',
    action: 'Contact your registrar if you did not authorize the renewal.'
  },
  pendingrestore: {
    label: 'Pending Restore',
    summary:
      'The registrar requested restoration and the registry is waiting on documentation or completion.',
    action:
      'Watch closely and contact the registrar if the domain falls back to redemption period.'
  },
  pendingtransfer: {
    label: 'Pending Transfer',
    summary: 'A registrar transfer request is in progress.',
    action:
      'Contact your registrar immediately if you did not request the transfer.'
  },
  pendingupdate: {
    label: 'Pending Update',
    summary: 'A domain update request is being processed.',
    action: 'Contact your registrar if you did not request the update.'
  },
  redemptionperiod: {
    label: 'Redemption Period',
    summary:
      'The domain was deleted by the registrar and is in the restore window before permanent removal.',
    action:
      'Contact your registrar immediately if you want to restore the domain.'
  },
  renewperiod: {
    label: 'Renew Period',
    summary: 'Short grace period after an explicit registrar-driven renewal.',
    action: 'Contact your registrar if the renewal was not expected.'
  },
  serverdeleteprohibited: {
    label: 'Server Delete Prohibited',
    summary:
      'Registry-level lock prevents deletion, often due to dispute, policy, or enhanced lock service.',
    action:
      'Contact your registrar if you need the reason or want the lock removed.'
  },
  serverhold: {
    label: 'Server Hold',
    summary:
      'Registry disabled DNS activation, so the domain will not resolve.',
    action:
      'Contact your registrar because this usually indicates a registry-side issue or restriction.'
  },
  serverrenewprohibited: {
    label: 'Server Renew Prohibited',
    summary: 'Registry is blocking renewal of the domain.',
    action:
      'Contact your registrar promptly to understand and resolve the restriction.'
  },
  servertransferprohibited: {
    label: 'Server Transfer Prohibited',
    summary: 'Registry-level lock prevents transfer to another registrar.',
    action:
      'Contact your registrar if you need the transfer unlocked or explained.'
  },
  serverupdateprohibited: {
    label: 'Server Update Prohibited',
    summary: 'Registry-level lock prevents updates to domain data.',
    action:
      'Contact your registrar if you need changes made or need the restriction explained.'
  },
  transferperiod: {
    label: 'Transfer Period',
    summary: 'Grace period after a successful registrar transfer.',
    action:
      'Contact your previous or current registrar if the transfer was not expected.'
  },
  clientdeleteprohibited: {
    label: 'Client Delete Prohibited',
    summary: 'Registrar lock preventing deletion of the domain.',
    action:
      'Ask your registrar to remove the lock if you intentionally want to delete the domain.'
  },
  clienthold: {
    label: 'Client Hold',
    summary:
      'Registrar disabled DNS activation, so the domain will not resolve.',
    action:
      'Contact your registrar because this often indicates billing, policy, or compliance issues.'
  },
  clientrenewprohibited: {
    label: 'Client Renew Prohibited',
    summary: 'Registrar is blocking renewal of the domain.',
    action:
      'Contact your registrar if you want to renew or need the restriction removed.'
  },
  clienttransferprohibited: {
    label: 'Client Transfer Prohibited',
    summary: 'Registrar lock preventing transfer to another registrar.',
    action:
      'This is usually protective. Ask your registrar to remove it only if you intend to transfer the domain.'
  },
  clientupdateprohibited: {
    label: 'Client Update Prohibited',
    summary: 'Registrar lock preventing updates to the domain.',
    action:
      'Contact your registrar if you need to change nameservers or registrant settings.'
  }
};

const TONE_CLASSES = {
  success:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  clientLock: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  serverLock:
    'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  period:
    'border-stone-500/30 bg-stone-500/10 text-stone-700 dark:text-stone-300',
  inactive:
    'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  neutral: 'border-muted-foreground/20 bg-muted/50 text-foreground'
};

const normalizeStatusKey = (status: string) =>
  status.toLowerCase().replace(/[\s_-]+/g, '');

function getStatusTone(status: string): keyof typeof TONE_CLASSES {
  const key = normalizeStatusKey(status);
  if (key === 'ok' || key === 'active') return 'success';
  if (key === 'inactive') return 'inactive';
  if (key.includes('hold')) return 'danger';
  if (key === 'redemptionperiod' || key === 'pendingdelete') return 'danger';
  if (key.startsWith('pending')) return 'warning';
  if (key.startsWith('client') && key.endsWith('prohibited'))
    return 'clientLock';
  if (key.startsWith('server') && key.endsWith('prohibited'))
    return 'serverLock';
  if (key.endsWith('period')) return 'period';
  return 'neutral';
}

function StatusChips({ statuses }: { statuses: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {statuses.map((status, idx) => {
        const info = EPP_STATUS_INFO[normalizeStatusKey(status)];
        return (
          <span
            key={`${status}-${idx}`}
            title={
              info
                ? `${info.label}: ${info.summary}\nWhat to do: ${info.action}`
                : undefined
            }
            className={`rounded border px-1.5 py-px font-mono text-[11px] ${TONE_CLASSES[getStatusTone(status)]} ${info ? 'cursor-help' : ''}`}
          >
            {status}
          </span>
        );
      })}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const { status, copied, copy } = useCopyToClipboard();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copy(value)}
      className="h-5 w-5 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
      aria-label={
        status === 'error' ? 'Copy failed' : copied ? 'Copied' : `Copy ${value}`
      }
    >
      {status === 'error' ? (
        <X className="h-3 w-3 text-destructive" />
      ) : copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

/** A key/value cell; renders nothing when the value is empty. */
function Field({
  label,
  children,
  copy,
  wide,
  mono
}: {
  label: string;
  children: ReactNode;
  copy?: string;
  wide?: boolean;
  mono?: boolean;
}) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div
      className={`min-w-0 ${wide ? 'col-span-full' : ''} ${copy ? 'group' : ''}`}
    >
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={`flex items-center gap-1 text-sm ${mono ? 'font-mono break-all' : 'break-words'}`}
      >
        <span className="min-w-0">{children}</span>
        {copy && <CopyButton value={copy} />}
      </dd>
    </div>
  );
}

const FIELD_GRID =
  'grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Date with a relative hint; `expiry` adds expired wording and amber/red tones. */
function DateValue({
  value,
  expiry
}: {
  value?: string | null;
  expiry?: boolean;
}) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const abs = Math.abs(days);
  const relative =
    abs < 45
      ? rtf.format(days, 'day')
      : abs < 730
        ? rtf.format(Math.round(days / 30.44), 'month')
        : rtf.format(Math.round(days / 365.25), 'year');
  const tone = !expiry
    ? 'text-muted-foreground'
    : days < 30
      ? 'text-rose-600 dark:text-rose-400'
      : days < 90
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';
  return (
    <span title={value}>
      {date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}{' '}
      <span className={`text-xs ${tone}`}>
        ({expiry && days < 0 ? `expired ${relative}` : relative})
      </span>
    </span>
  );
}

type ContactRow = {
  role: string;
  handle?: string | null;
  name?: string | null;
  org?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  other?: string | null;
};

const CONTACT_COLUMNS: [keyof ContactRow, string][] = [
  ['role', 'Role'],
  ['name', 'Name'],
  ['org', 'Organization'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['location', 'Location'],
  ['handle', 'Handle / ID'],
  ['other', 'Other']
];

const REDACTED = /redact|data protected|not disclosed|withheld/i;

function ContactTable({ rows }: { rows: ContactRow[] }) {
  const columns = CONTACT_COLUMNS.filter(([key]) =>
    rows.some((row) => row[key])
  );
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto border-t">
      <table className="w-full text-left text-xs">
        <thead className="text-[11px] text-muted-foreground">
          <tr>
            {columns.map(([key, label]) => (
              <th key={key} className="px-4 py-1.5 font-normal">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t align-top">
              {columns.map(([key]) => {
                const value = row[key];
                return (
                  <td
                    key={key}
                    className={`px-4 py-1.5 ${key === 'role' ? 'font-medium' : ''} ${key === 'email' || key === 'handle' ? 'font-mono' : ''} ${key === 'email' || key === 'handle' || key === 'phone' ? 'whitespace-nowrap' : ''}`}
                  >
                    {value && REDACTED.test(value) ? (
                      <span
                        className="text-muted-foreground italic"
                        title={value}
                      >
                        redacted
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function vcardValues(entity: RdapEntity, type: string): string[] {
  return (entity.vcardArray?.[1] ?? [])
    .filter((entry) => entry[0] === type)
    .map((entry) => {
      const value = entry[3];
      if (Array.isArray(value)) {
        const parts = value.flat().filter(Boolean);
        if (parts.length) return parts.join(', ');
        return typeof entry[1]?.label === 'string' ? entry[1].label : '';
      }
      return value ?? '';
    })
    .filter(Boolean);
}

const join = (values: (string | null | undefined)[], sep = ', ') =>
  values.filter(Boolean).join(sep) || null;

const humanize = (action?: string) =>
  action ? action.charAt(0).toUpperCase() + action.slice(1) : '';

/** Flattens RDAP entities (and nested ones, e.g. a registrar's abuse contact) into table rows. */
function entityRows(
  entities: RdapEntity[] = [],
  parent?: string
): ContactRow[] {
  return entities.flatMap((entity) => {
    const role = entity.roles?.join(', ') || 'entity';
    const fullRole = parent ? `${parent} › ${role}` : role;
    const row: ContactRow = {
      role: fullRole,
      handle: entity.handle,
      name: join(vcardValues(entity, 'fn')),
      org: join(vcardValues(entity, 'org')),
      email: join(vcardValues(entity, 'email')),
      phone: join(vcardValues(entity, 'tel')),
      location: join(vcardValues(entity, 'adr'), '; '),
      other: join(
        [
          ...(entity.publicIds ?? []).map(
            (id) => `${id.type}: ${id.identifier}`
          ),
          entity.status?.length ? `status: ${entity.status.join(', ')}` : null,
          ...(entity.events ?? []).map(
            (event) =>
              `${event.eventAction}: ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'}`
          )
        ],
        '; '
      )
    };
    return [row, ...entityRows(entity.entities, fullRole)];
  });
}

function NoticeList({
  notices = [],
  remarks = [],
  links = []
}: {
  notices?: RdapNotice[];
  remarks?: RdapNotice[];
  links?: RdapLink[];
}) {
  const count = notices.length + remarks.length + links.length;
  if (count === 0) return null;
  return (
    <details className="border-t px-4 py-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground select-none">
        Registry notices & links ({count})
      </summary>
      <ul className="mt-2 space-y-1.5">
        {[...notices, ...remarks].map((notice, idx) => (
          <li key={`n-${idx}`}>
            {notice.title && (
              <span className="font-medium">{notice.title}: </span>
            )}
            <span className="text-muted-foreground">
              {notice.description?.join(' ')}
            </span>
            {notice.links?.map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline"
              >
                {link.rel || 'link'}
              </a>
            ))}
          </li>
        ))}
        {links.map((link, idx) => (
          <li key={`l-${idx}`} className="break-all">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {link.rel || 'link'}
            </a>
            {link.type && (
              <span className="text-muted-foreground"> ({link.type})</span>
            )}{' '}
            <span className="font-mono text-muted-foreground">{link.href}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function RawDetails({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <details className="border-t px-4 py-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground select-none">
        {label}
      </summary>
      <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap break-words">
        {text}
      </pre>
    </details>
  );
}

function Header({
  name,
  type,
  source
}: {
  name: string;
  type: string;
  source: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5">
      <span className="group inline-flex min-w-0 items-center gap-1 font-mono text-base font-semibold break-all">
        {name}
        <CopyButton value={name} />
      </span>
      <Badge variant="secondary" className="font-mono text-[10px] uppercase">
        {type}
      </Badge>
      <span className="ml-auto text-xs text-muted-foreground">{source}</span>
    </div>
  );
}

const CARD = 'rounded-lg border bg-card text-card-foreground';

function WhoisFallback({ data }: { data: WhoisFallbackResult }) {
  const p = data.parsedWhois;
  const contactRows: ContactRow[] = p
    ? (['registrant', 'admin', 'tech'] as const)
        .map((key) => {
          const c = p.contacts?.[key];
          return {
            role: key,
            handle: p[`${key}Id`],
            name: c?.name,
            org: c?.organization,
            email: c?.email,
            phone: c?.phone,
            location: join([c?.city, c?.state, c?.country])
          };
        })
        .filter((row) =>
          Object.entries(row).some(([k, v]) => k !== 'role' && v)
        )
    : [];

  return (
    <div className={CARD}>
      <Header
        name={data.name}
        type="domain"
        source={`WHOIS · ${data.sourceServer || 'whois.iana.org'}`}
      />
      {data.referralError && (
        <p className="border-b bg-amber-500/5 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
          {data.referralServer
            ? `The referred WHOIS server ${data.referralServer} did not return a usable response. Showing IANA registry data instead.`
            : 'The referred WHOIS server did not return a usable response.'}{' '}
          <span className="font-mono text-muted-foreground">
            {data.referralError}
          </span>
        </p>
      )}
      <dl className={FIELD_GRID}>
        <Field label="Fallback reason">
          {data._fallbackReason || 'RDAP unavailable'}
        </Field>
        <Field label="Referral server" mono>
          {data.referralServer || 'None'}
        </Field>
        <Field label="Lookup chain">
          {data.sourceChain?.length > 0 && (
            <span className="font-mono">{data.sourceChain.join(' → ')}</span>
          )}
        </Field>
        {p && (
          <>
            <Field label="Registrar">
              {join([
                p.registrar,
                p.registrarIanaId && `IANA ${p.registrarIanaId}`
              ])}
            </Field>
            <Field label="Registrar URL">{p.registrarUrl}</Field>
            <Field label="Registrar WHOIS" mono>
              {p.registrarWhoisServer}
            </Field>
            <Field label="Registrant">{p.registrant}</Field>
            <Field label="Registrant location">
              {join([p.registrantCity, p.registrantState, p.registrantCountry])}
            </Field>
            <Field label="Registered">
              {p.creationDate && <DateValue value={p.creationDate} />}
            </Field>
            <Field label="Expires">
              {p.expirationDate && (
                <DateValue value={p.expirationDate} expiry />
              )}
            </Field>
            <Field label="Last changed">
              {p.updatedDate && <DateValue value={p.updatedDate} />}
            </Field>
            <Field label="DNSSEC">{p.dnssec}</Field>
            <Field label="Registry domain ID" mono>
              {p.registryDomainId}
            </Field>
            <Field label="Abuse email">{p.abuseEmail}</Field>
            <Field label="Abuse phone">{p.abusePhone}</Field>
            <Field label="Status (parsed)" wide>
              {p.status?.length > 0 && <StatusChips statuses={p.status} />}
            </Field>
            <Field label={`Nameservers (${p.nameservers?.length})`} wide>
              {p.nameservers?.length > 0 && (
                <Nameservers names={p.nameservers.map((name) => ({ name }))} />
              )}
            </Field>
          </>
        )}
      </dl>
      <ContactTable rows={contactRows} />
      {p && (
        <p className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">
          Fields above are a best-effort parse of the raw WHOIS text.
        </p>
      )}
      {data.referralServer && (
        <RawDetails label="IANA referral response" text={data.ianaResponse} />
      )}
      <RawDetails label="Raw WHOIS response" text={data.rawWhois} />
      <RawDetails
        label="Raw API response"
        text={JSON.stringify(data, null, 2)}
      />
    </div>
  );
}

function Nameservers({ names }: { names: { name: string; ips?: string[] }[] }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[13px]">
      {names.map(({ name, ips }, idx) => (
        <span
          key={`${name}-${idx}`}
          className="group inline-flex items-center gap-0.5"
        >
          {name}
          {ips && ips.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({ips.join(', ')})
            </span>
          )}
          <CopyButton value={name} />
        </span>
      ))}
    </span>
  );
}

const EVENT_LABELS: Record<string, string> = {
  registration: 'Registered',
  expiration: 'Expires',
  'last changed': 'Last changed',
  'last update of rdap database': 'RDAP updated'
};

function dnssecSummary(s: SecureDnsInfo): string {
  if (s.zoneSigned && s.delegationSigned) return 'Signed';
  if (!s.zoneSigned && !s.delegationSigned) return 'Unsigned';
  return s.delegationSigned
    ? 'Delegation signed, zone unsigned'
    : 'Zone signed, delegation unsigned';
}

export function WhoisResults({ data, query }: WhoisResultsProps) {
  if (data._source === 'whois') {
    return <WhoisFallback data={data as WhoisFallbackResult} />;
  }

  const rdap = data as RdapData;
  const queryType: QueryType = rdap._queryType || 'domain';
  const isIp = queryType === 'ipv4' || queryType === 'ipv6';
  const displayName =
    (queryType === 'domain' && rdap.ldhName) ||
    rdap.name ||
    rdap.handle ||
    rdap.ldhName ||
    query;
  const registrar = rdap.entities?.find((e) => e.roles?.includes('registrar'));
  const registrarIana = registrar?.publicIds?.find((id) =>
    /iana/i.test(id.type ?? '')
  )?.identifier;
  const statuses = rdap.status ?? [];
  const ds = rdap.secureDNS?.dsData ?? [];

  return (
    <div className={CARD}>
      <Header
        name={displayName}
        type={rdap.objectClassName || queryType}
        source="RDAP"
      />
      <dl className={FIELD_GRID}>
        {queryType === 'domain' && (
          <Field label="Registrar">
            {registrar &&
              join([
                vcardValues(registrar, 'fn')[0] || registrar.handle,
                registrarIana && `IANA ${registrarIana}`
              ])}
          </Field>
        )}
        {rdap.events?.map((event, idx) => {
          const action = event.eventAction?.toLowerCase() ?? '';
          return (
            <Field
              key={idx}
              label={EVENT_LABELS[action] || humanize(event.eventAction)}
            >
              {event.eventDate ? (
                <DateValue
                  value={event.eventDate}
                  expiry={action === 'expiration'}
                />
              ) : (
                'N/A'
              )}
            </Field>
          );
        })}
        {rdap.secureDNS && (
          <Field label="DNSSEC">{dnssecSummary(rdap.secureDNS)}</Field>
        )}
        <Field label="Handle" mono copy={rdap.handle}>
          {rdap.handle}
        </Field>
        {isIp && (
          <>
            <Field label="CIDR" mono>
              {rdap.cidr0_cidrs
                ?.map((c) => `${c.v4prefix || c.v6prefix}/${c.length}`)
                .join(', ')}
            </Field>
            <Field label="Start address" mono copy={rdap.startAddress}>
              {rdap.startAddress}
            </Field>
            <Field label="End address" mono copy={rdap.endAddress}>
              {rdap.endAddress}
            </Field>
            <Field label="IP version">
              {rdap.ipVersion &&
                `IPv${String(rdap.ipVersion).replace(/^v/i, '')}`}
            </Field>
            <Field label="Parent network" mono>
              {rdap.parentHandle}
            </Field>
          </>
        )}
        {queryType === 'asn' && (
          <Field label="AS number" mono>
            {rdap.startAutnum !== undefined &&
              (rdap.endAutnum === undefined ||
              rdap.endAutnum === rdap.startAutnum
                ? `AS${rdap.startAutnum}`
                : `AS${rdap.startAutnum} – AS${rdap.endAutnum}`)}
          </Field>
        )}
        <Field label="Type">{rdap.type}</Field>
        <Field label="Country">{rdap.country}</Field>
        <Field label="WHOIS server" mono>
          {rdap.port43}
        </Field>
        {rdap.publicIds?.map((id, idx) => (
          <Field key={idx} label={id.type || 'Public ID'} mono>
            {id.identifier}
          </Field>
        ))}
        <Field label="Status" wide>
          {statuses.length > 0 ? (
            <StatusChips statuses={statuses} />
          ) : (
            <span className="text-muted-foreground">No status available</span>
          )}
        </Field>
        {queryType === 'domain' && (
          <Field label={`Nameservers (${rdap.nameservers?.length ?? 0})`} wide>
            {(rdap.nameservers?.length ?? 0) > 0 && (
              <Nameservers
                names={rdap.nameservers!.map((ns) => ({
                  name: ns.ldhName || ns.unicodeName || query,
                  ips: [
                    ...(ns.ipAddresses?.v4 ?? []),
                    ...(ns.ipAddresses?.v6 ?? [])
                  ]
                }))}
              />
            )}
          </Field>
        )}
        <Field label="DS records" wide mono>
          {ds.length > 0 &&
            ds.map((d, idx) => (
              <span key={idx} className="block text-xs">
                key {d.keyTag} · alg {d.algorithm} · digest type {d.digestType}{' '}
                · <span className="text-muted-foreground">{d.digest}</span>
              </span>
            ))}
        </Field>
      </dl>
      <ContactTable rows={entityRows(rdap.entities)} />
      <NoticeList
        notices={rdap.notices}
        remarks={rdap.remarks}
        links={rdap.links}
      />
      <RawDetails
        label="Raw RDAP response"
        text={JSON.stringify(data, null, 2)}
      />
    </div>
  );
}
