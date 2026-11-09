'use client';

import type { ReactNode } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Card } from '@/components/ui/card';
import { Copy, Check, X, ShieldCheck } from 'lucide-react';
import { matchProvider, Pill, ProviderPill } from '@/components/osint/pills';
import { cn } from '@/lib/utils';

// Normalized certificate data interface
export interface CertificateData {
  commonName: string;
  subject: Record<string, string>;
  issuer: Record<string, string>;
  serialNumber: string;
  validFrom: Date | string;
  validTo: Date | string;
  publicKeyAlgorithm?: string;
  signatureAlgorithm?: string;
  sans?: string[];
  fingerprint?: string;
  sha256?: string;
  pem?: string;
  isWildcard?: boolean;
  isPrecert?: boolean;
  isCA?: boolean;
  validationType?: 'DV' | 'OV' | 'EV';
}

interface CertificateDetailsProps {
  certificate: CertificateData;
  showPem?: boolean;
  className?: string;
}

const DAY = 86_400_000;

// Parse DN string like "CN=R13,O=Let's Encrypt,C=US" into object
export function parseDN(dn: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = dn.split(/,(?=\s*[A-Z]+=)/);
  for (const part of parts) {
    const match = part.trim().match(/^([A-Z]+)=(.+)$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

function fmt(d: Date) {
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

export function CertificateDetails({
  certificate: c,
  showPem = true,
  className = ''
}: CertificateDetailsProps) {
  const from = toDate(c.validFrom);
  const to = toDate(c.validTo);
  const now = Date.now();
  const daysLeft = Math.floor((to.getTime() - now) / DAY);
  const lifetime = Math.round((to.getTime() - from.getTime()) / DAY);
  const state =
    to.getTime() < now ? 'expired' : daysLeft < 30 ? 'expiring' : 'valid';
  const isWildcard = c.isWildcard ?? c.commonName?.startsWith('*.');
  const issuerName = c.issuer.O ?? c.issuer.CN ?? 'Unknown issuer';
  const provider = matchProvider(issuerName);
  const subjectPlace = [c.subject.L, c.subject.ST, c.subject.C]
    .filter(Boolean)
    .join(', ');
  const fingerprint = c.sha256 || c.fingerprint;

  return (
    <Card className={cn('gap-4 p-4', className)}>
      {/* Name and status */}
      <div className="space-y-2">
        <h3 className="font-mono text-lg font-semibold break-all">
          {c.commonName}
        </h3>
        <div className="flex flex-wrap gap-1">
          <Pill
            tone={
              state === 'expired'
                ? 'bad'
                : state === 'expiring'
                  ? 'warn'
                  : 'good'
            }
          >
            {state === 'expired'
              ? `Expired ${-daysLeft}d ago`
              : state === 'expiring'
                ? `Expires in ${daysLeft}d`
                : `Valid · ${daysLeft}d left`}
          </Pill>
          {c.validationType && (
            <Pill
              tone={c.validationType === 'DV' ? 'neutral' : 'info'}
              title={
                {
                  DV: 'Domain validated: proves control of the domain only',
                  OV: 'Organization validated: the CA checked the organization',
                  EV: 'Extended validation: the strictest organization checks'
                }[c.validationType]
              }
            >
              {c.validationType}
            </Pill>
          )}
          {isWildcard && <Pill>Wildcard</Pill>}
          {c.isPrecert && <Pill>Precertificate</Pill>}
          {c.isCA && <Pill tone="info">CA</Pill>}
          {c.publicKeyAlgorithm && <Pill mono>{c.publicKeyAlgorithm}</Pill>}
          {c.signatureAlgorithm && <Pill mono>{c.signatureAlgorithm}</Pill>}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Issuer">
          <span className="flex flex-wrap items-center gap-1.5">
            <ProviderPill
              label={issuerName}
              domain={provider?.domain ?? null}
              fallback={<ShieldCheck className="h-3 w-3" />}
            />
            {c.issuer.CN && c.issuer.CN !== issuerName && (
              <span className="text-xs text-muted-foreground">
                {c.issuer.CN}
                {c.issuer.C && ` · ${c.issuer.C}`}
              </span>
            )}
          </span>
        </Field>
        {c.subject.O && (
          <Field label="Organization">
            {c.subject.O}
            {c.subject.OU && (
              <span className="text-muted-foreground"> · {c.subject.OU}</span>
            )}
          </Field>
        )}
        {subjectPlace && <Field label="Location">{subjectPlace}</Field>}
        <Field label="Valid from">{fmt(from)}</Field>
        <Field label="Valid until">
          <span
            className={cn(
              state === 'expired' && 'text-red-600 dark:text-red-400',
              state === 'expiring' && 'text-amber-700 dark:text-amber-400'
            )}
          >
            {fmt(to)}
          </span>
        </Field>
        <Field label="Lifetime">{lifetime} days</Field>
        <Field label="Serial number" copy={c.serialNumber} wide>
          <span className="font-mono text-xs break-all">{c.serialNumber}</span>
        </Field>
        {fingerprint && (
          <Field
            label={c.sha256 ? 'SHA-256 fingerprint' : 'Fingerprint'}
            copy={fingerprint}
            wide
          >
            <span className="font-mono text-xs break-all">{fingerprint}</span>
          </Field>
        )}
      </dl>

      {c.sans && c.sans.length > 0 && (
        <Field
          label={`Subject alternative names (${c.sans.length})`}
          copy={c.sans.join('\n')}
        >
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs">
            {c.sans.map((n) => (
              <span key={n} className="break-all">
                {n}
              </span>
            ))}
          </span>
        </Field>
      )}

      {showPem && c.pem && (
        <details className="group border-t pt-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
            PEM certificate
            <CopyButton value={c.pem} label="Copy PEM" />
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
            {c.pem}
          </pre>
        </details>
      )}
    </Card>
  );
}

function Field({
  label,
  children,
  copy,
  wide
}: {
  label: string;
  children: ReactNode;
  copy?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2 lg:col-span-3')}>
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {label}
        {copy && (
          <CopyButton value={copy} label={`Copy ${label.toLowerCase()}`} />
        )}
      </dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { status, copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={(e) => {
        // Inside <summary> the click would also toggle the details.
        e.preventDefault();
        copy(value);
      }}
      aria-label={
        status === 'error' ? 'Copy failed' : copied ? 'Copied' : label
      }
      title={label}
      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {status === 'error' ? (
        <X className="h-3 w-3 text-destructive" />
      ) : copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
