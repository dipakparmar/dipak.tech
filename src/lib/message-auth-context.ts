import type { AuthenticationResults, HeaderEntry } from './email-header-parser';

export interface LiveAuthLookupContext {
  fromDomain: string | null;
  returnPathDomain: string | null;
  spfDomain: string | null;
  spfClientIp: string | null;
  dkimSignatures: Array<{
    domain: string;
    selector: string;
  }>;
}

function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/\.$/, '');
  return normalized || null;
}

function normalizeSpfIdentity(value: string | null | undefined): string | null {
  const normalized = normalizeDomain(value);
  if (!normalized) return null;
  return extractDomainFromAddress(normalized) ?? normalized;
}

export function extractDomainFromAddress(
  value: string | null | undefined
): string | null {
  if (!value) return null;

  const angleMatch = value.match(/<([^>]+)>/);
  const candidate = angleMatch?.[1] ?? value;
  const addrMatch = candidate.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return normalizeDomain(addrMatch?.[1] ?? null);
}

function getHeaderValue(headers: HeaderEntry[], name: string): string | null {
  return (
    headers.find((header) => header.name.toLowerCase() === name.toLowerCase())
      ?.value ?? null
  );
}

function parseAuthFields(detail: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const match of detail.matchAll(/([a-z][a-z0-9_.-]*)=([^\s;]+)/gi)) {
    const [, key, rawValue] = match;
    values[key.toLowerCase()] = rawValue;
  }

  return values;
}

function parseReceivedSpf(value: string | null): {
  domain: string | null;
  clientIp: string | null;
} {
  if (!value) {
    return { domain: null, clientIp: null };
  }

  const explicitMailFrom = value.match(/envelope-from=([^\s;]+)/i)?.[1];
  const descriptiveMailFrom = value.match(
    /domain of ([^\s)]+) designates/i
  )?.[1];
  const clientIp = value.match(/client-ip=([^\s;]+)/i)?.[1] ?? null;

  return {
    domain: normalizeSpfIdentity(
      explicitMailFrom ?? descriptiveMailFrom ?? null
    ),
    clientIp
  };
}

function parseDkimHeader(value: string): {
  domain: string | null;
  selector: string | null;
} {
  const domain = normalizeDomain(
    value.match(/(?:^|;)\s*d=([^;\s]+)/i)?.[1] ?? null
  );
  const selector =
    value
      .match(/(?:^|;)\s*s=([^;\s]+)/i)?.[1]
      ?.trim()
      .toLowerCase() ?? null;
  return { domain, selector };
}

export function deriveLiveAuthLookupContext(
  headers: HeaderEntry[],
  authentication: AuthenticationResults,
  fromHeader: string | null
): LiveAuthLookupContext {
  const fromDomain = extractDomainFromAddress(fromHeader);
  const returnPathDomain = extractDomainFromAddress(
    getHeaderValue(headers, 'return-path')
  );
  const receivedSpf = parseReceivedSpf(getHeaderValue(headers, 'received-spf'));

  let spfDomain = receivedSpf.domain;
  let spfClientIp = receivedSpf.clientIp;
  const dkimSignatures: LiveAuthLookupContext['dkimSignatures'] = [];

  for (const result of authentication.results) {
    const fields = parseAuthFields(result.detail);

    if (result.method.toLowerCase() === 'spf') {
      spfDomain =
        spfDomain ?? normalizeSpfIdentity(fields['smtp.mailfrom'] ?? null);
      spfClientIp = spfClientIp ?? fields['client-ip'] ?? null;
    }

    if (result.method.toLowerCase() === 'dkim') {
      const domain = normalizeDomain(
        fields['header.d'] ??
          (fields['header.i']?.includes('@')
            ? (fields['header.i'].split('@').pop() ?? null)
            : null)
      );
      const selector = fields['header.s']?.toLowerCase() ?? null;
      if (domain && selector) {
        dkimSignatures.push({ domain, selector });
      }
    }
  }

  for (const header of headers) {
    if (header.name.toLowerCase() !== 'dkim-signature') continue;
    const parsed = parseDkimHeader(header.value);
    if (parsed.domain && parsed.selector) {
      dkimSignatures.push({ domain: parsed.domain, selector: parsed.selector });
    }
  }

  const uniqueDkim = Array.from(
    new Map(
      dkimSignatures.map((signature) => [
        `${signature.selector}:${signature.domain}`,
        signature
      ])
    ).values()
  );

  return {
    fromDomain,
    returnPathDomain,
    spfDomain: spfDomain ?? returnPathDomain ?? fromDomain,
    spfClientIp,
    dkimSignatures: uniqueDkim
  };
}
