import type { AnnotationReference } from '@/lib/header-annotations';

const MICROSOFT_HEADERS_DOC =
  'https://learn.microsoft.com/en-us/defender-office-365/message-headers-eop-mdo';

export interface ProviderHeaderValueGuide {
  title: string;
  description: string;
  why: string;
  howToRead: string;
  references?: AnnotationReference[];
}

export type ProviderHeaderValueTokenKind = 'tag' | 'text' | 'json';

export interface ProviderHeaderValueToken {
  kind: ProviderHeaderValueTokenKind;
  key: string;
  value: string;
  raw: string;
  guide: ProviderHeaderValueGuide;
}

function makeValueGuide(
  title: string,
  description: string,
  why: string,
  howToRead: string,
  references?: AnnotationReference[]
): ProviderHeaderValueGuide {
  return { title, description, why, howToRead, references };
}

export function parseTaggedHeaderValues(
  value: string,
  explainers: Record<
    string,
    (fieldValue: string) => ProviderHeaderValueGuide | undefined
  >
): ProviderHeaderValueToken[] {
  return value
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => {
      const separatorIndex = token.indexOf(':');
      if (separatorIndex === -1) return [];

      const key = token.slice(0, separatorIndex).trim().toUpperCase();
      const fieldValue = token.slice(separatorIndex + 1).trim();
      const guide = explainers[key]?.(fieldValue);

      if (!guide) return [];

      return [
        { kind: 'tag' as const, key, value: fieldValue, raw: token, guide }
      ];
    });
}

const MICROSOFT_FOREGROUND_FIELD_EXPLAINERS: Record<
  string,
  (fieldValue: string) => ProviderHeaderValueGuide | undefined
> = {
  CAT: (fieldValue) => {
    const categories: Record<string, string> = {
      AMP: 'Anti-malware policy matched the message.',
      BIMP: 'Brand impersonation protection matched the message.',
      BULK: 'Bulk-mail policy matched the message.',
      DIMP: 'Domain impersonation protection matched the message.',
      FTBP: 'Common attachments malware filtering matched the message.',
      GIMP: 'Mailbox intelligence impersonation protection matched the message.',
      HPHSH: 'High-confidence phishing verdict.',
      HPHISH: 'High-confidence phishing verdict.',
      HSPM: 'High-confidence spam verdict.',
      INTOS: 'Intra-organization phishing verdict.',
      MALW: 'Malware verdict.',
      OSPM: 'Outbound spam verdict.',
      PHSH: 'Phishing verdict.',
      SAP: 'Safe Attachments handling matched the message.',
      SPM: 'Spam verdict.',
      SPOOF: 'Spoofing verdict.',
      UIMP: 'User impersonation protection matched the message.'
    };
    const summary = categories[fieldValue.toUpperCase()];
    if (!summary) return undefined;

    return makeValueGuide(
      'X-Forefront-Antispam-Report • CAT',
      summary,
      'This identifies the Microsoft protection category that won precedence for the message.',
      'If multiple detections were possible, Microsoft applies the highest-priority category first.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  CIP: (fieldValue) =>
    makeValueGuide(
      'X-Forefront-Antispam-Report • CIP',
      'Connecting IP address observed by Microsoft.',
      'This is the IP Microsoft used for connection-based filtering and geo/reputation checks.',
      'Investigate this IP when checking allow/block decisions or sender infrastructure.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    ),
  CTRY: (fieldValue) =>
    makeValueGuide(
      'X-Forefront-Antispam-Report • CTRY',
      'Country or region inferred from the connecting IP.',
      'Useful for spotting mail that originated from an unexpected geography.',
      fieldValue
        ? `Microsoft mapped the connecting IP to ${fieldValue}. This can differ from the visible sender’s location.`
        : 'Blank means Microsoft did not stamp a country/region value here.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    ),
  DIR: (fieldValue) => {
    const summary: Record<string, string> = {
      INB: 'Inbound message.',
      OUT: 'Outbound message.',
      INT: 'Internal message.'
    };
    const meaning = summary[fieldValue.toUpperCase()];
    if (!meaning) return undefined;

    return makeValueGuide(
      'X-Forefront-Antispam-Report • DIR',
      meaning,
      'Directionality helps distinguish internet mail from internal or outbound flows.',
      'Treat this as transport direction, not as a spam verdict.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  H: (fieldValue) =>
    makeValueGuide(
      'X-Forefront-Antispam-Report • H',
      'HELO or EHLO string presented by the connecting mail server.',
      'A suspicious HELO can expose low-quality or mismatched sending infrastructure.',
      fieldValue
        ? 'Compare this string against the connecting IP, PTR, and expected sender infrastructure.'
        : 'Blank means Microsoft did not stamp a HELO/EHLO string here.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    ),
  IPV: (fieldValue) => {
    const summary: Record<string, string> = {
      CAL: 'Filtering was skipped because the source IP was on the IP Allow List.',
      NLI: 'The connecting IP was not found on an IP reputation list.'
    };
    const meaning = summary[fieldValue.toUpperCase()];
    if (!meaning) return undefined;

    return makeValueGuide(
      'X-Forefront-Antispam-Report • IPV',
      meaning,
      'This shows how Microsoft treated the sender IP during reputation or allow-list evaluation.',
      'IPV is about IP treatment, not the final spam verdict by itself.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  LANG: (fieldValue) =>
    makeValueGuide(
      'X-Forefront-Antispam-Report • LANG',
      'Language Microsoft inferred for the message.',
      'Unexpected language can be a useful phishing or bulk-mail signal.',
      fieldValue
        ? `Microsoft classified the message language as ${fieldValue}.`
        : 'Blank means Microsoft did not stamp a language value here.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    ),
  PTR: (fieldValue) =>
    makeValueGuide(
      'X-Forefront-Antispam-Report • PTR',
      'Reverse DNS (PTR) name for the connecting IP.',
      'PTR mismatches often help explain poor sender reputation or suspicious infrastructure.',
      fieldValue
        ? 'Compare this PTR hostname against the connecting IP, HELO string, and sender domain.'
        : 'Blank means Microsoft did not stamp a PTR name here.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    ),
  SCL: (fieldValue) => {
    const score = Number.parseInt(fieldValue, 10);
    if (Number.isNaN(score)) return undefined;

    let classification =
      'Microsoft assigned a spam confidence score to the message.';
    if (score === -1)
      classification =
        'Microsoft treated the message as trusted or bypassed normal spam filtering.';
    else if (score <= 1)
      classification = 'Microsoft considered the message unlikely to be spam.';
    else if (score <= 4)
      classification =
        'Microsoft saw mild spam indicators but did not strongly classify the message as spam.';
    else if (score <= 6)
      classification = 'Microsoft considered the message spam-like.';
    else
      classification =
        'Microsoft considered the message highly likely to be spam.';

    return makeValueGuide(
      'X-Forefront-Antispam-Report • SCL',
      classification,
      'SCL is one of the main Microsoft spam verdict signals surfaced in delivered headers.',
      'Values run from -1 to 9. Higher means more spam-like.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  SFTY: (fieldValue) => {
    const summary: Record<string, string> = {
      '9.19': 'Domain impersonation safety tip.',
      '9.20': 'User impersonation safety tip.',
      '9.25': 'First-contact safety tip.'
    };
    const meaning = summary[fieldValue];
    if (!meaning) return undefined;

    return makeValueGuide(
      'X-Forefront-Antispam-Report • SFTY',
      meaning,
      'This indicates Microsoft attached a phishing-related safety tip to the message experience.',
      'The specific code tells you which safety-tip scenario triggered.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  SFV: (fieldValue) => {
    const summary: Record<string, string> = {
      BLK: 'Filtering was skipped and the message was blocked because the sender was on a user Blocked Senders list.',
      NSPM: 'Spam filtering marked the message as non-spam and delivered it to the intended recipients.',
      SFE: 'Filtering was skipped and the message was allowed because the sender was on a user Safe Senders list.',
      SKA: 'Spam filtering was skipped and the message went to the Inbox because the sender/domain was allowed by anti-spam policy.',
      SKB: 'The message was marked as spam because the sender/domain matched a blocked entry in anti-spam policy.',
      SKN: 'The message was marked as non-spam before normal spam filtering, such as by SCL -1 or a bypass rule.',
      SKQ: 'The message was released from quarantine and delivered.',
      SKS: 'The message was marked as spam before normal spam filtering, such as by a mail flow rule.',
      SPM: 'The message was marked as spam by spam filtering.'
    };
    const meaning = summary[fieldValue.toUpperCase()];
    if (!meaning) return undefined;

    return makeValueGuide(
      'X-Forefront-Antispam-Report • SFV',
      meaning,
      'SFV is one of the clearest indicators of Microsoft’s final spam-filter handling path.',
      'Use this together with SCL and mailbox-delivery headers to understand why the message landed where it did.',
      [
        {
          label: 'Microsoft anti-spam headers docs',
          url: MICROSOFT_HEADERS_DOC
        }
      ]
    );
  },
  SRV: (fieldValue) =>
    fieldValue.toUpperCase() === 'BULK'
      ? makeValueGuide(
          'X-Forefront-Antispam-Report • SRV',
          'Microsoft identified the message as bulk email using spam filtering and BCL thresholding.',
          'Bulk classification helps explain why a message may be treated as lower trust even if it is not malicious.',
          'Review this with BCL and sender expectations to decide whether the mail is just marketing traffic or unwanted bulk.',
          [
            {
              label: 'Microsoft anti-spam headers docs',
              url: MICROSOFT_HEADERS_DOC
            }
          ]
        )
      : undefined
};

export function parseMicrosoftForefrontAntispamReport(
  value: string
): ProviderHeaderValueToken[] {
  return parseTaggedHeaderValues(value, MICROSOFT_FOREGROUND_FIELD_EXPLAINERS);
}

export function parseMicrosoftAntispam(
  value: string
): ProviderHeaderValueToken[] {
  return parseTaggedHeaderValues(value, {
    BCL: (fieldValue) => {
      const score = Number.parseInt(fieldValue, 10);
      if (Number.isNaN(score)) return undefined;

      let description =
        'Microsoft assigned a bulk complaint level to the message.';
      if (score <= 1)
        description =
          'Microsoft did not strongly classify the message as bulk mail.';
      else if (score <= 4)
        description = 'Microsoft saw some bulk-mail characteristics.';
      else if (score <= 7)
        description = 'Microsoft considered the message likely bulk mail.';
      else
        description =
          'Microsoft considered the message highly likely to be bulk mail.';

      return makeValueGuide(
        'X-Microsoft-Antispam • BCL',
        description,
        'BCL explains marketing or newsletter-style classification separately from pure spam or phishing verdicts.',
        'Higher BCL means more likely bulk. Read it alongside SCL or mailbox delivery, not in isolation.',
        [
          {
            label: 'Microsoft anti-spam headers docs',
            url: MICROSOFT_HEADERS_DOC
          }
        ]
      );
    }
  });
}
