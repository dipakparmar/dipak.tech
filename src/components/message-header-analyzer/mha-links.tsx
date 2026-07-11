import { Badge } from '@/components/ui/badge';

function looksLikeIp(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) || s.includes(':');
}

// Known compound TLDs - take 3 labels instead of 2 for apex extraction
const COMPOUND_TLDS = new Set([
  'co.uk',
  'org.uk',
  'me.uk',
  'net.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'net.nz',
  'org.nz',
  'co.jp',
  'ne.jp',
  'or.jp',
  'co.za',
  'org.za',
  'net.za',
  'com.br',
  'net.br',
  'org.br',
  'com.sg',
  'net.sg',
  'org.sg'
]);

export function apexDomain(domain: string): string {
  const clean = domain.replace(/\.$/, '').toLowerCase();
  const labels = clean.split('.');
  if (labels.length <= 2) return clean;
  const twoRight = labels.slice(-2).join('.');
  if (COMPOUND_TLDS.has(twoRight)) return labels.slice(-3).join('.');
  return twoRight;
}

export function DomainBadge({ domain }: { domain: string }) {
  const apex = apexDomain(domain);
  return (
    <a
      href={`https://tools.dipak.io/whois?q=${encodeURIComponent(apex)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Badge
        variant="outline"
        className="cursor-pointer font-mono hover:bg-muted"
      >
        {domain}
      </Badge>
    </a>
  );
}

export function IpBadge({ ip }: { ip: string }) {
  return (
    <a
      href={`https://tools.dipak.io/ip?ip=${encodeURIComponent(ip)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Badge
        variant="outline"
        className="cursor-pointer font-mono hover:bg-muted"
      >
        {ip}
      </Badge>
    </a>
  );
}

// Inline domain link (no badge) used inside text/table cells
export function DomainLink({
  domain,
  className
}: {
  domain: string;
  className?: string;
}) {
  const apex = apexDomain(domain);
  return (
    <a
      href={`https://tools.dipak.io/whois?q=${encodeURIComponent(apex)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'underline decoration-dotted underline-offset-2 hover:text-foreground'
      }
    >
      {domain}
    </a>
  );
}

export function IpLink({ ip, className }: { ip: string; className?: string }) {
  return (
    <a
      href={`https://tools.dipak.io/ip?ip=${encodeURIComponent(ip)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'underline decoration-dotted underline-offset-2 hover:text-foreground'
      }
    >
      {ip}
    </a>
  );
}

// Smart link for SMTP hop hostnames - handles plain domains, IPs, and bracket-wrapped IPs [1.2.3.4]
export function HostLink({ host }: { host: string }) {
  const bracketMatch = host.match(/^\[(.+)\]$/);
  const rawIp = bracketMatch ? bracketMatch[1] : host;
  if (looksLikeIp(rawIp)) {
    return (
      <a
        href={`https://tools.dipak.io/ip?ip=${encodeURIComponent(rawIp)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono font-medium break-all underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        {host}
      </a>
    );
  }
  const apex = apexDomain(host);
  return (
    <a
      href={`https://tools.dipak.io/whois?q=${encodeURIComponent(apex)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono font-medium break-all underline decoration-dotted underline-offset-2 hover:text-foreground"
    >
      {host}
    </a>
  );
}
