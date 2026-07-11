import type { LiveAuthLookupContext } from './message-auth-context';

export type CheckStatus = 'ok' | 'problem' | 'warning' | 'info';

export interface LiveCheck {
  label: string;
  status: CheckStatus;
  message: string;
}

export interface SpfMechanismRow {
  prefix: string;
  type: string;
  value: string;
  prefixDescription: string;
  description: string;
}

export type DmarcStandard = 'rfc9989' | 'rfc7489' | 'mixed' | 'compatible';

export interface LiveDmarcResult {
  domain: string;
  record: string | null;
  standard: DmarcStandard | null; // detected DMARC standard based on tags present
  tags: {
    p: string | null;
    sp: string | null;
    np: string | null; // RFC 9989: policy for non-existent subdomains (NXDOMAIN), distinct from sp
    adkim: string | null;
    aspf: string | null;
    fo: string | null; // failure reporting options
    psd: string | null; // RFC 9989: Public Suffix Domain indicator (y/n/u)
    t: string | null; // RFC 9989: test mode - downgrades policy one level when "y"
    pct: number | null; // RFC 7489 only; removed in RFC 9989/DMARCbis
    rua: string[];
    ruf: string[];
  };
  checks: LiveCheck[];
}

export function detectDmarcStandard(
  tags: Record<string, string>
): DmarcStandard | null {
  if (!tags.v) return null;
  const hasRfc9989Tags = !!(tags.np || tags.psd || tags.t);
  const hasRfc7489Tags = !!tags.pct;
  if (hasRfc9989Tags && hasRfc7489Tags) return 'mixed';
  if (hasRfc9989Tags) return 'rfc9989';
  if (hasRfc7489Tags) return 'rfc7489';
  return 'compatible'; // valid for both; no standard-specific tags
}

export interface SpfTreeNode {
  domain: string;
  record: string | null;
  error: string | null;
  mechanisms: SpfMechanismRow[];
  includes: SpfTreeNode[];
  redirect: SpfTreeNode | null;
}

export interface LiveSpfResult {
  domain: string;
  clientIp: string | null;
  record: string | null;
  recordsFound: number;
  evaluation: {
    result: string;
    explanation: string;
  } | null;
  mechanisms: SpfMechanismRow[];
  tree: SpfTreeNode | null;
  checks: LiveCheck[];
}

export interface LiveDkimResult {
  domain: string;
  selector: string;
  record: string | null;
  tags: {
    v: string | null;
    p: string | null;
    k: string | null;
  };
  checks: LiveCheck[];
}

// ATPS - RFC 6541 (Experimental), https://www.rfc-editor.org/rfc/rfc6541
// Domain owner publishes <hash(signer)>._atps.<author_domain> TXT records.
// Third-party signer adds atps=<author_domain> and atpsh=<alg> to DKIM-Signature header.
// DNS lookup: base32(sha256(signer_domain))._atps.<author_domain> OR
//             <signer_domain>._atps.<author_domain> when atpsh=none
export interface AtpsCheckedSigner {
  signerDomain: string;
  hashAlgorithm: 'sha256' | 'none';
  dnsName: string; // the DNS name that was queried
  record: string | null; // raw TXT response, null if NXDOMAIN/NODATA
  authorized: boolean; // true if record contained v=ATPS1
}

export interface LiveAtpsResult {
  authorDomain: string;
  // Note: full ATPS evaluation also requires atps= and atpsh= tags in the
  // DKIM-Signature header (RFC 6541 s3). This is a DNS-level authorization check only.
  signers: AtpsCheckedSigner[];
  checks: LiveCheck[];
}

export interface LiveAuthVerificationResponse {
  context: LiveAuthLookupContext;
  dnsProvider: {
    name: string | null;
    nameserver: string | null;
  };
  dmarc: LiveDmarcResult | null;
  spf: LiveSpfResult | null;
  dkim: LiveDkimResult[];
  dara: null;
  atps: LiveAtpsResult | null;
  checkedAt: string;
}

const SPF_PREFIX_DESCRIPTIONS: Record<string, string> = {
  '+': 'Pass',
  '-': 'Fail',
  '~': 'SoftFail',
  '?': 'Neutral'
};

const SPF_MECHANISM_DESCRIPTIONS: Record<string, string> = {
  all: 'Always matches. It should appear at the end of the record.',
  include: "Matches when the included domain's SPF evaluation returns pass.",
  ip4: 'Authorizes the listed IPv4 address or network.',
  ip6: 'Authorizes the listed IPv6 address or network.',
  a: "Authorizes the current domain's A or AAAA records, or another named host.",
  mx: "Authorizes the IPs behind the domain's MX hosts.",
  exists: 'Matches if the named domain returns any DNS A record.',
  ptr: 'Deprecated mechanism based on reverse DNS.',
  redirect: 'Modifier: delegates SPF evaluation to another domain.',
  exp: 'Modifier: provides an explanation string for failures.'
};

export function parseTagList(record: string): Record<string, string> {
  return record
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const eqIndex = part.indexOf('=');
      if (eqIndex === -1) return acc;
      const key = part.slice(0, eqIndex).trim().toLowerCase();
      const value = part.slice(eqIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

export function parseSpfMechanisms(record: string): SpfMechanismRow[] {
  return record
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((token) => {
      // Modifiers use name=value syntax (redirect=, exp=, or unknown per RFC 7208 Section 3.1)
      const modifierMatch = token.match(/^([a-z][a-z0-9]*)=(.+)$/i);
      if (modifierMatch) {
        const [, type, value] = modifierMatch;
        return {
          prefix: '',
          type: type.toLowerCase(),
          value,
          prefixDescription: '',
          description:
            SPF_MECHANISM_DESCRIPTIONS[type.toLowerCase()] ?? 'SPF modifier'
        };
      }

      // Mechanisms: [qualifier][name][:value][/cidr4][//cidr6] or [//cidr6]
      // RFC 7208 dual-cidr form is /24//64 (double slash before IPv6 length), not /24/64.
      // Handles: a, a/24, a//64, a/24//64, a:dom, a:dom/24, a:dom/24//64, ip4:addr/24, etc.
      const match = token.match(
        /^([+?~-]?)([a-z][a-z0-9]*)(?::([^/]+))?((?:\/\d+(?:\/\/\d+)?|\/\/\d+)?)$/i
      );
      if (!match) {
        return {
          prefix: '',
          type: token,
          value: '',
          prefixDescription: '',
          description: 'Unrecognized SPF token'
        };
      }

      const [, qualifier = '', type, rawValue = '', cidrSuffix = ''] = match;
      return {
        prefix: qualifier,
        type: type.toLowerCase(),
        value: rawValue + cidrSuffix,
        prefixDescription: SPF_PREFIX_DESCRIPTIONS[qualifier || '+'] ?? '',
        description:
          SPF_MECHANISM_DESCRIPTIONS[type.toLowerCase()] ??
          'SPF mechanism or modifier'
      };
    });
}
