import { Socket } from 'node:net';

const IANA_WHOIS_SERVER = 'whois.iana.org';
const WHOIS_PORT = 43;
const WHOIS_TIMEOUT_MS = 12000;
const MAX_WHOIS_RESPONSE_BYTES = 256 * 1024;

export interface WhoisFallbackResult extends Record<string, unknown> {
  _query: string;
  _queryType: 'domain';
  _source: 'whois';
  _format: 'text';
  _fallbackReason: string;
  objectClassName: 'whois';
  name: string;
  rawWhois: string;
  ianaResponse: string;
  referralServer: string | null;
  sourceServer: string;
  sourceChain: string[];
  referralError: string | null;
  parsedWhois: ParsedWhoisData;
}

export interface ParsedWhoisData extends Record<string, unknown> {
  registrar: string | null;
  registrarUrl: string | null;
  registrarIanaId: string | null;
  registrant: string | null;
  registryDomainId: string | null;
  registrantId: string | null;
  adminId: string | null;
  techId: string | null;
  creationDate: string | null;
  expirationDate: string | null;
  updatedDate: string | null;
  dnssec: string | null;
  nameservers: string[];
  status: string[];
  abuseEmail: string | null;
  abusePhone: string | null;
  registrarWhoisServer: string | null;
  registrantCountry: string | null;
  registrantState: string | null;
  registrantCity: string | null;
  contacts: ParsedWhoisContacts;
}

export interface ParsedWhoisContact extends Record<string, unknown> {
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
}

export interface ParsedWhoisContacts extends Record<string, ParsedWhoisContact> {
  registrant: ParsedWhoisContact;
  admin: ParsedWhoisContact;
  tech: ParsedWhoisContact;
}

const FIELD_PATTERNS = {
  registrar: [
    /^\s*registrar:\s*(.+)$/im,
    /^\s*sponsoring registrar:\s*(.+)$/im
  ],
  registrant: [
    /^\s*registrant(?: name| organization| org| contact name)?:\s*(.+)$/im,
    /^\s*org(?:anisation|anization)?:\s*(.+)$/im
  ],
  creationDate: [
    /^\s*creation date:\s*(.+)$/im,
    /^\s*created:\s*(.+)$/im,
    /^\s*created on:\s*(.+)$/im,
    /^\s*domain registration date:\s*(.+)$/im,
    /^\s*registered on:\s*(.+)$/im
  ],
  expirationDate: [
    /^\s*registry expiry date:\s*(.+)$/im,
    /^\s*registrar registration expiration date:\s*(.+)$/im,
    /^\s*expiration date:\s*(.+)$/im,
    /^\s*expires on:\s*(.+)$/im,
    /^\s*paid-till:\s*(.+)$/im
  ],
  updatedDate: [
    /^\s*updated date:\s*(.+)$/im,
    /^\s*changed:\s*(.+)$/im,
    /^\s*last updated on:\s*(.+)$/im,
    /^\s*last update of whois database:\s*(.+)$/im
  ],
  abuseEmail: [
    /^\s*registrar abuse contact email:\s*(.+)$/im,
    /^\s*abuse-mailbox:\s*(.+)$/im
  ],
  abusePhone: [
    /^\s*registrar abuse contact phone:\s*(.+)$/im,
    /^\s*abuse contact phone:\s*(.+)$/im
  ],
  registrarUrl: [
    /^\s*registrar url:\s*(.+)$/im
  ],
  registrarIanaId: [
    /^\s*registrar iana id:\s*(.+)$/im
  ],
  registryDomainId: [
    /^\s*registry domain id:\s*(.+)$/im,
    /^\s*domain id:\s*(.+)$/im
  ],
  registrantId: [
    /^\s*registry registrant id:\s*(.+)$/im,
    /^\s*registrant id:\s*(.+)$/im
  ],
  adminId: [
    /^\s*registry admin id:\s*(.+)$/im,
    /^\s*admin id:\s*(.+)$/im
  ],
  techId: [
    /^\s*registry tech id:\s*(.+)$/im,
    /^\s*tech id:\s*(.+)$/im
  ],
  dnssec: [
    /^\s*dnssec:\s*(.+)$/im
  ],
  registrarWhoisServer: [
    /^\s*registrar whois server:\s*(.+)$/im,
    /^\s*whois server:\s*(.+)$/im
  ]
} as const;

export function extractDomainTld(domain: string): string | null {
  const normalized = domain.trim().toLowerCase();
  const parts = normalized.split('.').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

export function extractWhoisReferralServer(rawWhois: string): string | null {
  const match = rawWhois.match(/^\s*whois:\s*(.+)\s*$/im);
  return match?.[1]?.trim() || null;
}

export function isWhoisDomainNotFound(rawWhois: string): boolean {
  const normalized = rawWhois.toLowerCase();

  const patterns = [
    /\bno match for\b/,
    /\bnot found\b/,
    /\bno entries found\b/,
    /\bno data found\b/,
    /\bno object found\b/,
    /\bdomain you requested is not known\b/,
    /\bstatus:\s*available\b/,
    /\bstatus:\s*free\b/,
    /\bno such domain\b/,
    /\bno domain records were found\b/,
    /\bno matching record\b/
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

function matchFirst(rawWhois: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = rawWhois.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function collectMatches(rawWhois: string, patterns: readonly RegExp[]): string[] {
  const values = new Set<string>();

  for (const pattern of patterns) {
    for (const match of rawWhois.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))) {
      const value = match[1]?.trim();
      if (value) values.add(value);
    }
  }

  return [...values];
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+\(.+\)\s*$/, '').trim();
}

function normalizeWhoisStatus(value: string): string {
  return value
    .replace(/\s+https?:\/\/\S+$/i, '')
    .replace(/\s+\[[^\]]+\]\s*$/i, '')
    .trim();
}

function isDomainNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Domain not found';
}

function emptyContact(): ParsedWhoisContact {
  return {
    name: null,
    organization: null,
    email: null,
    phone: null,
    country: null,
    state: null,
    city: null
  };
}

function extractContactField(rawWhois: string, role: string, fieldPatterns: string[]): string | null {
  for (const field of fieldPatterns) {
    const directPattern = new RegExp(`^\\s*${role}\\s+${field}:\\s*(.+)$`, 'im');
    const directMatch = rawWhois.match(directPattern);
    if (directMatch?.[1]?.trim()) return directMatch[1].trim();

    const prefixedPattern = new RegExp(`^\\s*${role}\\s*${field}:\\s*(.+)$`, 'im');
    const prefixedMatch = rawWhois.match(prefixedPattern);
    if (prefixedMatch?.[1]?.trim()) return prefixedMatch[1].trim();
  }

  return null;
}

function extractIanaContactBlock(rawWhois: string, role: string): ParsedWhoisContact | null {
  const blockPattern = new RegExp(`contact:\\s*${role}\\n([\\s\\S]*?)(?:\\ncontact:\\s*\\w+|\\n\\n|\\n(?:nserver|ds-rdata|whois|status|remarks|created|changed|source):|$)`, 'i');
  const blockMatch = rawWhois.match(blockPattern);
  if (!blockMatch?.[1]) return null;

  const block = blockMatch[1];
  const pick = (label: string) => block.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, 'im'))?.[1]?.trim() || null;

  const contact: ParsedWhoisContact = {
    name: pick('name'),
    organization: pick('organisation') || pick('organization'),
    email: pick('e-mail') || pick('email'),
    phone: pick('phone'),
    country: pick('country'),
    state: pick('state') || pick('state/province'),
    city: pick('city')
  };

  return Object.values(contact).some(Boolean) ? contact : null;
}

function parseWhoisContacts(rawWhois: string): ParsedWhoisContacts {
  const registrant: ParsedWhoisContact = {
    name: extractContactField(rawWhois, 'Registrant', ['Name']) || extractContactField(rawWhois, 'Registrant', ['Contact Name']),
    organization: extractContactField(rawWhois, 'Registrant', ['Organization', 'Org']),
    email: extractContactField(rawWhois, 'Registrant', ['Email']),
    phone: extractContactField(rawWhois, 'Registrant', ['Phone']),
    country: extractContactField(rawWhois, 'Registrant', ['Country']),
    state: extractContactField(rawWhois, 'Registrant', ['State/Province', 'State']),
    city: extractContactField(rawWhois, 'Registrant', ['City'])
  };

  const admin: ParsedWhoisContact = {
    name: extractContactField(rawWhois, 'Admin', ['Name']),
    organization: extractContactField(rawWhois, 'Admin', ['Organization', 'Org']),
    email: extractContactField(rawWhois, 'Admin', ['Email']),
    phone: extractContactField(rawWhois, 'Admin', ['Phone']),
    country: extractContactField(rawWhois, 'Admin', ['Country']),
    state: extractContactField(rawWhois, 'Admin', ['State/Province', 'State']),
    city: extractContactField(rawWhois, 'Admin', ['City'])
  };

  const tech: ParsedWhoisContact = {
    name: extractContactField(rawWhois, 'Tech', ['Name']),
    organization: extractContactField(rawWhois, 'Tech', ['Organization', 'Org']),
    email: extractContactField(rawWhois, 'Tech', ['Email']),
    phone: extractContactField(rawWhois, 'Tech', ['Phone']),
    country: extractContactField(rawWhois, 'Tech', ['Country']),
    state: extractContactField(rawWhois, 'Tech', ['State/Province', 'State']),
    city: extractContactField(rawWhois, 'Tech', ['City'])
  };

  const ianaAdmin = extractIanaContactBlock(rawWhois, 'administrative');
  const ianaTech = extractIanaContactBlock(rawWhois, 'technical');

  return {
    registrant: Object.values(registrant).some(Boolean) ? registrant : emptyContact(),
    admin: Object.values(admin).some(Boolean) ? admin : ianaAdmin || emptyContact(),
    tech: Object.values(tech).some(Boolean) ? tech : ianaTech || emptyContact()
  };
}

export function parseWhoisText(rawWhois: string): ParsedWhoisData {
  const contacts = parseWhoisContacts(rawWhois);
  const nameservers = collectMatches(rawWhois, [
    /^\s*name server:\s*(.+)$/im,
    /^\s*nserver:\s*(.+)$/im,
    /^\s*nameserver:\s*(.+)$/im
  ]).map((value) => value.split(/\s+/)[0].toLowerCase());

  const status = collectMatches(rawWhois, [
    /^\s*domain status:\s*(.+)$/im,
    /^\s*status:\s*(.+)$/im,
    /^\s*state:\s*(.+)$/im
  ]).map(normalizeWhoisStatus).filter(Boolean);

  return {
    registrar: matchFirst(rawWhois, FIELD_PATTERNS.registrar),
    registrarUrl: matchFirst(rawWhois, FIELD_PATTERNS.registrarUrl),
    registrarIanaId: matchFirst(rawWhois, FIELD_PATTERNS.registrarIanaId),
    registrant: matchFirst(rawWhois, FIELD_PATTERNS.registrant),
    registryDomainId: matchFirst(rawWhois, FIELD_PATTERNS.registryDomainId),
    registrantId: matchFirst(rawWhois, FIELD_PATTERNS.registrantId),
    adminId: matchFirst(rawWhois, FIELD_PATTERNS.adminId),
    techId: matchFirst(rawWhois, FIELD_PATTERNS.techId),
    creationDate: normalizeDate(matchFirst(rawWhois, FIELD_PATTERNS.creationDate)),
    expirationDate: normalizeDate(matchFirst(rawWhois, FIELD_PATTERNS.expirationDate)),
    updatedDate: normalizeDate(matchFirst(rawWhois, FIELD_PATTERNS.updatedDate)),
    dnssec: matchFirst(rawWhois, FIELD_PATTERNS.dnssec),
    nameservers: [...new Set(nameservers)],
    status,
    abuseEmail: matchFirst(rawWhois, FIELD_PATTERNS.abuseEmail),
    abusePhone: matchFirst(rawWhois, FIELD_PATTERNS.abusePhone),
    registrarWhoisServer: matchFirst(rawWhois, FIELD_PATTERNS.registrarWhoisServer),
    registrantCountry: contacts.registrant.country,
    registrantState: contacts.registrant.state,
    registrantCity: contacts.registrant.city,
    contacts
  };
}

export async function queryWhoisServer(server: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    let sawData = false;

    const buildResponse = () => Buffer.concat(chunks).toString('utf8').trim();

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      handler();
    };

    socket.setTimeout(WHOIS_TIMEOUT_MS);

    socket.on('connect', () => {
      socket.write(`${query}\r\n`);
    });

    socket.on('data', (chunk: Buffer) => {
      sawData = true;
      totalBytes += chunk.length;
      if (totalBytes > MAX_WHOIS_RESPONSE_BYTES) {
        finish(() => reject(new Error(`WHOIS response from ${server} exceeded size limit`)));
        return;
      }
      chunks.push(chunk);
    });

    socket.on('timeout', () => {
      if (sawData) {
        finish(() => resolve(buildResponse()));
        return;
      }
      finish(() => reject(new Error(`WHOIS query to ${server} timed out`)));
    });

    socket.on('error', (error) => {
      finish(() => reject(new Error(`WHOIS query to ${server} failed: ${error.message}`)));
    });

    socket.on('end', () => {
      finish(() => resolve(buildResponse()));
    });

    socket.on('close', () => {
      if (sawData) {
        finish(() => resolve(buildResponse()));
      }
    });

    socket.connect(WHOIS_PORT, server);
  });
}

export async function queryDomainWhoisFallback(
  domain: string,
  fallbackReason: string
): Promise<WhoisFallbackResult> {
  const normalizedDomain = domain.trim().toLowerCase();
  const tld = extractDomainTld(normalizedDomain);

  if (!tld) {
    throw new Error('Unable to determine TLD for WHOIS fallback');
  }

  const ianaResponse = await queryWhoisServer(IANA_WHOIS_SERVER, tld);
  const referralServer = extractWhoisReferralServer(ianaResponse);

  if (!referralServer) {
    const parsedWhois = parseWhoisText(ianaResponse);
    return {
      _query: normalizedDomain,
      _queryType: 'domain',
      _source: 'whois',
      _format: 'text',
      _fallbackReason: fallbackReason,
      objectClassName: 'whois',
      name: normalizedDomain,
      rawWhois: ianaResponse,
      ianaResponse,
      referralServer: null,
      sourceServer: IANA_WHOIS_SERVER,
      sourceChain: [IANA_WHOIS_SERVER],
      referralError: null,
      parsedWhois
    };
  }

  try {
    const rawWhois = await queryWhoisServer(referralServer, normalizedDomain);
    if (isWhoisDomainNotFound(rawWhois)) {
      throw new Error('Domain not found');
    }
    const parsedWhois = parseWhoisText(rawWhois);

    return {
      _query: normalizedDomain,
      _queryType: 'domain',
      _source: 'whois',
      _format: 'text',
      _fallbackReason: fallbackReason,
      objectClassName: 'whois',
      name: normalizedDomain,
      rawWhois,
      ianaResponse,
      referralServer,
      sourceServer: referralServer,
      sourceChain: [IANA_WHOIS_SERVER, referralServer],
      referralError: null,
      parsedWhois
    };
  } catch (error) {
    if (isDomainNotFoundError(error)) {
      throw error;
    }

    const degradedReason = error instanceof Error ? error.message : `WHOIS query to ${referralServer} failed`;
    const parsedWhois = parseWhoisText(ianaResponse);

    return {
      _query: normalizedDomain,
      _queryType: 'domain',
      _source: 'whois',
      _format: 'text',
      _fallbackReason: `${fallbackReason}. Referral WHOIS degraded: ${degradedReason}`,
      objectClassName: 'whois',
      name: normalizedDomain,
      rawWhois: ianaResponse,
      ianaResponse,
      referralServer,
      sourceServer: IANA_WHOIS_SERVER,
      sourceChain: [IANA_WHOIS_SERVER, referralServer],
      referralError: degradedReason,
      parsedWhois
    };
  }
}
