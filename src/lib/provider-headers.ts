import type { HeaderEntry } from '@/lib/email-header-parser'
import type { AnnotationReference } from '@/lib/header-annotations'

export interface ProviderHeaderGuide {
  title: string
  description: string
  why: string
  howToRead: string
  references?: AnnotationReference[]
}

interface ProviderHeaderRule extends ProviderHeaderGuide {
  exact?: string
  prefix?: string
  headerName?: string
  valuePattern?: RegExp
}

interface ProviderDefinition {
  id: string
  name: string
  summary: string
  note: string
  rules: ProviderHeaderRule[]
}

export interface ProviderHeaderDetection {
  providerId: string
  providerName: string
  summary: string
  note: string
  matchedHeaders: Array<{
    name: string
    value: string
    guide: ProviderHeaderGuide
  }>
}

const SALESFORCE_EMAIL_HEADER_DOC =
  'https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_compref_messaging_emailHeader.htm'
const SALESFORCE_ORG_ID_HELP =
  'https://help.salesforce.com/s/articleView?id=000386477&language=en_US&type=1'
const SALESFORCE_INBOUND_CAVEAT =
  'https://help.salesforce.com/s/articleView?id=000390516&language=en_US&type=1'

const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'sendgrid',
    name: 'Twilio SendGrid',
    summary:
      'SendGrid stamps internal correlation headers that are useful for tracing activity and support cases.',
    note:
      'These headers suggest the message passed through SendGrid infrastructure, but they do not by themselves prove the visible From address is trustworthy.',
    rules: [
      {
        exact: 'x-sg-id',
        title: 'X-SG-ID',
        description: 'SendGrid internal message identifier.',
        why: 'Useful when correlating a received message with SendGrid logs or support requests.',
        howToRead: 'Treat the value as an opaque SendGrid message ID rather than something end users can decode.'
      },
      {
        exact: 'x-sg-eid',
        title: 'X-SG-EID',
        description: 'SendGrid internal event identifier tied to analytics and tracking.',
        why: 'Helpful for matching a delivered message to SendGrid activity records.',
        howToRead: 'Opaque token. Most useful when cross-referencing SendGrid event data.'
      },
      {
        exact: 'x-message-id',
        title: 'X-Message-ID',
        description: 'Provider correlation identifier commonly used by SendGrid for event lookup.',
        why: 'Lets operators map the raw email to provider-side logs and webhook events.',
        howToRead: 'Use it as a correlation key. Do not treat it as the same thing as RFC Message-ID.'
      },
      {
        exact: 'x-smtpapi',
        title: 'X-SMTPAPI',
        description: 'JSON control header used by SendGrid SMTP integrations.',
        why: 'Can reveal categories, substitutions, scheduling, and unique arguments attached at send time.',
        howToRead: 'Parse it as JSON if present. Look for categories, filters, and custom arguments.'
      }
    ]
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    summary:
      'Mailchimp marketing mail often exposes account and campaign-level identifiers in custom headers.',
    note:
      'These headers are usually more useful for campaign attribution and allowlisting than for security decisions on their own.',
    rules: [
      {
        headerName: 'x-mailer',
        valuePattern: /^MailChimp Mailer\b/i,
        title: 'X-Mailer: MailChimp Mailer',
        description: 'Mailchimp campaign mailer identifier, often including a campaign ID.',
        why: 'A strong indicator that the message was sent through Mailchimp marketing infrastructure.',
        howToRead: 'Look for the MailChimp mailer string and any embedded CID-style campaign token.'
      },
      {
        exact: 'x-mc-user',
        title: 'X-MC-User',
        description: 'Mailchimp account identifier.',
        why: 'Useful for mapping a message back to a specific Mailchimp tenant or sender account.',
        howToRead: 'Treat as an account-scoped ID, often useful for allowlisting or support.'
      },
      {
        exact: 'x-report-abuse',
        title: 'X-Report-Abuse',
        description: 'Mailchimp abuse-reporting endpoint.',
        why: 'Signals that the message came from a bulk marketing workflow with complaint handling.',
        howToRead: 'Usually contains a reporting URL rather than a human-readable diagnostic value.'
      }
    ]
  },
  {
    id: 'mandrill',
    name: 'Mailchimp Transactional / Mandrill',
    summary:
      'Mandrill-style headers expose tags and metadata used for transactional message analytics.',
    note:
      'These headers are often application-defined and best used for correlation, not trust decisions.',
    rules: [
      {
        exact: 'x-mc-tags',
        title: 'X-MC-Tags',
        description: 'Mandrill transactional tags attached to the message.',
        why: 'Helps identify the application workflow, template, or category that sent the email.',
        howToRead: 'Usually a comma-separated list of tags such as password-reset or receipt.'
      },
      {
        exact: 'x-mc-metadata',
        title: 'X-MC-Metadata',
        description: 'Mandrill metadata blob for application-defined key/value tracking.',
        why: 'Useful for tracing the message back to internal user or event IDs.',
        howToRead: 'Often JSON or a compact key/value structure with app-specific identifiers.'
      }
    ]
  },
  {
    id: 'postmark',
    name: 'Postmark',
    summary:
      'Postmark headers describe message streams, tracking settings, and custom metadata.',
    note:
      'Postmark metadata is operationally useful, especially when debugging transactional mail flow or template usage.',
    rules: [
      {
        exact: 'x-pm-tag',
        title: 'X-PM-Tag',
        description: 'Postmark tag used to categorize the message.',
        why: 'Helps identify the transactional workflow that generated the email.',
        howToRead: 'Usually a short label such as welcome-email or password-reset.'
      },
      {
        exact: 'x-pm-message-stream',
        title: 'X-PM-Message-Stream',
        description: 'Postmark message stream selection.',
        why: 'Shows whether the message came from a specific outbound or broadcast stream.',
        howToRead: 'Look for a stream name like outbound or a custom stream identifier.'
      },
      {
        prefix: 'x-pm-metadata-',
        title: 'X-PM-Metadata-*',
        description: 'Postmark custom metadata header.',
        why: 'Often carries application identifiers that are valuable during incident response or delivery debugging.',
        howToRead: 'Everything after the prefix is the metadata key. The value is the metadata payload.'
      },
      {
        exact: 'x-pm-trackopens',
        title: 'X-PM-TrackOpens',
        description: 'Per-message Postmark open tracking flag.',
        why: 'Confirms whether open tracking was explicitly enabled or disabled for this send.',
        howToRead: 'Expect true or false.'
      },
      {
        exact: 'x-pm-tracklinks',
        title: 'X-PM-TrackLinks',
        description: 'Postmark link tracking mode.',
        why: 'Explains whether Postmark rewrote links for click tracking.',
        howToRead: 'Common values include HtmlAndText, HtmlOnly, TextOnly, and None.'
      },
      {
        exact: 'x-pm-keepid',
        title: 'X-PM-KeepID',
        description: 'Instructs Postmark to preserve the existing Message-ID.',
        why: 'Useful when you need continuity between an application-generated Message-ID and the delivered message.',
        howToRead: 'Expect true when the sender asked Postmark not to replace Message-ID.'
      }
    ]
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    summary:
      'Mailgun headers carry tags, recipient variables, and template metadata for event correlation.',
    note:
      'These are usually sender-controlled Mailgun features and help explain template personalization or analytics behavior.',
    rules: [
      {
        exact: 'x-mailgun-tag',
        title: 'X-Mailgun-Tag',
        description: 'Mailgun analytics tag.',
        why: 'Useful for identifying the feature or campaign that sent the message.',
        howToRead: 'Multiple instances can appear. Each value is a category label.'
      },
      {
        exact: 'x-mailgun-variables',
        title: 'X-Mailgun-Variables',
        description: 'Mailgun custom variables attached to the message.',
        why: 'Often includes application IDs that can link the message to internal events.',
        howToRead: 'Usually JSON. Parse it if you need sender-provided context.'
      },
      {
        exact: 'x-mailgun-recipient-variables',
        title: 'X-Mailgun-Recipient-Variables',
        description: 'Per-recipient Mailgun personalization payload.',
        why: 'Explains batch-personalized content or substitutions.',
        howToRead: 'Usually JSON keyed by recipient address.'
      },
      {
        exact: 'x-mailgun-template-variables',
        title: 'X-Mailgun-Template-Variables',
        description: 'Variables used with a stored Mailgun template.',
        why: 'Shows what data drove template rendering.',
        howToRead: 'Typically JSON for the selected Mailgun template.'
      },
      {
        exact: 'x-mailgun-template-name',
        title: 'X-Mailgun-Template-Name',
        description: 'Mailgun template name or identifier.',
        why: 'Useful for pinpointing the exact transactional template used.',
        howToRead: 'Treat the value as the template selector configured by the sender.'
      },
      {
        exact: 'x-mailgun-suppress-headers',
        title: 'X-Mailgun-Suppress-Headers',
        description: 'Mailgun control for stripping Mailgun headers from the final message.',
        why: 'Explains why some expected Mailgun headers may be absent.',
        howToRead: 'A value like all means Mailgun-specific headers were intentionally suppressed.'
      }
    ]
  },
  {
    id: 'brevo',
    name: 'Brevo / Sendinblue',
    summary:
      'Brevo commonly stamps internal message and event identifiers in the X-Mailin namespace.',
    note:
      'These IDs are mostly operational and are best used for provider-side tracing.',
    rules: [
      {
        exact: 'x-mailin-eid',
        title: 'X-Mailin-EID',
        description: 'Brevo internal event or message identifier.',
        why: 'Useful when tracking a specific send through Brevo support or event logs.',
        howToRead: 'Opaque encoded identifier.'
      },
      {
        exact: 'x-mailin-message-id',
        title: 'X-Mailin-Message-Id',
        description: 'Brevo message correlation identifier.',
        why: 'Lets operators correlate a delivered email with provider-side message records.',
        howToRead: 'Treat as an internal provider ID rather than the RFC Message-ID.'
      }
    ]
  },
  {
    id: 'ses',
    name: 'Amazon SES',
    summary:
      'SES-specific headers mainly help with provider tracing and feedback loop correlation.',
    note:
      'SES often relies more on envelope/authentication context than on many custom X- headers.',
    rules: [
      {
        exact: 'x-ses-outgoing',
        title: 'X-SES-Outgoing',
        description: 'Marks mail as processed by Amazon SES outbound infrastructure.',
        why: 'A good indicator that the message traversed SES.',
        howToRead: 'Presence matters more than the exact value.'
      },
      {
        exact: 'x-ses-message-id',
        title: 'X-SES-Message-ID',
        description: 'SES-assigned message identifier.',
        why: 'Useful for matching a raw email to SES logs, events, or API responses.',
        howToRead: 'Treat as the SES-side correlation ID.'
      }
    ]
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365 / Exchange Online',
    summary:
      'Microsoft adds detailed anti-spam, phishing, and cross-tenant transport diagnostics.',
    note:
      'These are some of the most useful headers for understanding Microsoft-side filtering and final mailbox routing decisions.',
    rules: [
      {
        exact: 'x-forefront-antispam-report',
        title: 'X-Forefront-Antispam-Report',
        description: 'Detailed Microsoft anti-spam diagnostic record.',
        why: 'Contains core verdict signals like SCL, connecting IP, and filtering context.',
        howToRead: 'Focus on SCL, SFV, CTRY, and CIP values first.'
      },
      {
        exact: 'x-ms-exchange-organization-scl',
        title: 'X-MS-Exchange-Organization-SCL',
        description: 'Microsoft Spam Confidence Level score.',
        why: 'Shows how strongly Microsoft classified the message as spam.',
        howToRead: 'Values range from -1 to 9. Higher means more spam-like.'
      },
      {
        exact: 'x-ms-exchange-organization-pcl',
        title: 'X-MS-Exchange-Organization-PCL',
        description: 'Microsoft phishing confidence score.',
        why: 'Useful for spotting messages Microsoft judged as phish-like even when delivery succeeded.',
        howToRead: 'Higher values indicate greater phishing suspicion.'
      },
      {
        exact: 'x-microsoft-antispam',
        title: 'X-Microsoft-Antispam',
        description: 'Microsoft anti-spam header containing bulk and phish-related signals.',
        why: 'Helps explain bulk classification and mailbox filtering outcomes.',
        howToRead: 'Look for fields such as BCL and PCL.'
      },
      {
        exact: 'x-microsoft-antispam-mailbox-delivery',
        title: 'X-Microsoft-Antispam-Mailbox-Delivery',
        description: 'Mailbox-level Microsoft delivery verdict.',
        why: 'Shows whether Microsoft routed the message to Inbox or Junk and why.',
        howToRead: 'dest:I usually means Inbox, dest:J usually means Junk.'
      },
      {
        exact: 'x-ms-exchange-crosstenant-network-message-id',
        title: 'X-MS-Exchange-CrossTenant-Network-Message-Id',
        description: 'Microsoft cross-tenant message trace identifier.',
        why: 'Very useful for message tracing in Microsoft 365 environments.',
        howToRead: 'Treat it as a GUID-like trace key.'
      },
      {
        exact: 'x-ms-exchange-crosstenant-id',
        title: 'X-MS-Exchange-CrossTenant-Id',
        description: 'Microsoft tenant identifier.',
        why: 'Can reveal the tenant context involved in message flow.',
        howToRead: 'Usually a GUID representing the tenant.'
      },
      {
        exact: 'x-ms-exchange-crosstenant-originalarrivaltime',
        title: 'X-MS-Exchange-CrossTenant-OriginalArrivalTime',
        description: 'First arrival timestamp in Microsoft cross-tenant flow.',
        why: 'Helpful for transport timing and trace reconstruction.',
        howToRead: 'Compare with Received headers to understand where latency was introduced.'
      },
      {
        exact: 'x-ms-exchange-transport-crosstenantheadersstamped',
        title: 'X-MS-Exchange-Transport-CrossTenantHeadersStamped',
        description: 'Transport server that stamped Microsoft cross-tenant headers.',
        why: 'Useful when tracing how Microsoft transport handled the message.',
        howToRead: 'Usually a host or service identifier.'
      }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    summary:
      'HubSpot marketing mail may expose portal and campaign identifiers in custom headers.',
    note:
      'These headers help attribute a message to a specific HubSpot account or campaign.',
    rules: [
      {
        exact: 'x-hubspot-message-source',
        title: 'X-HubSpot-Message-Source',
        description: 'Indicates HubSpot as the sending system.',
        why: 'Useful for attribution when a message may have passed through several services.',
        howToRead: 'Presence suggests HubSpot-originated delivery workflow.'
      },
      {
        exact: 'x-hubspot-portalid',
        title: 'X-HubSpot-PortalID',
        description: 'HubSpot portal/account identifier.',
        why: 'Lets operators tie a message back to a specific HubSpot tenant.',
        howToRead: 'Treat as the HubSpot account ID.'
      },
      {
        exact: 'x-hubspot-email-campaign-id',
        title: 'X-HubSpot-Email-Campaign-ID',
        description: 'HubSpot campaign identifier.',
        why: 'Useful for campaign-level tracing and troubleshooting.',
        howToRead: 'Use it as a campaign correlation key.'
      }
    ]
  },
  {
    id: 'salesforce-core',
    name: 'Salesforce Core Platform',
    summary:
      'Salesforce core-platform mail can expose org, user, record, relay, and TLS diagnostics through X-SFDC headers.',
    note:
      'Only a subset of these headers is officially documented by Salesforce. Treat undocumented X-SFDC headers as helpful signals, not stable API fields.',
    rules: [
      {
        exact: 'x-sfdc-lk',
        title: 'X-SFDC-LK',
        description: 'Salesforce org ID for the sending organization.',
        why: 'One of the most useful headers for allowlisting or confirming which Salesforce org generated the message.',
        howToRead: 'Expect a Salesforce org ID such as 00D.... Compare it against the org you expect.',
        references: [
          { label: 'Salesforce Help', url: SALESFORCE_ORG_ID_HELP },
          { label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }
        ]
      },
      {
        exact: 'x-sfdc-user',
        title: 'X-SFDC-User',
        description: 'Salesforce user ID that triggered the email action.',
        why: 'Helps identify which Salesforce user action or automation context caused the email to be sent.',
        howToRead: 'Expect a Salesforce user ID. Most useful during auditing or incident response.',
        references: [
          { label: 'Salesforce Help', url: SALESFORCE_ORG_ID_HELP },
          { label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }
        ]
      },
      {
        exact: 'x-sfdc-binding',
        title: 'X-SFDC-Binding',
        description: 'Internal Salesforce routing or binding token.',
        why: 'Primarily useful as a platform fingerprint showing Salesforce core mail processing.',
        howToRead: 'Treat the value as an opaque internal token.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-sfdc-entityid',
        title: 'X-SFDC-EntityId',
        description: 'Salesforce record ID associated with the email trigger.',
        why: 'Can link the message back to a specific Case, Opportunity, or other Salesforce record.',
        howToRead: 'Expect a Salesforce record ID. Use the object prefix to infer the record type if needed.'
      },
      {
        exact: 'x-sfdc-correlation-id',
        title: 'X-SFDC-CORRELATION-ID',
        description: 'Internal Salesforce email pipeline correlation ID.',
        why: 'Useful for tracing a message through Salesforce-side delivery diagnostics.',
        howToRead: 'Opaque identifier intended for correlation, not user interpretation.'
      },
      {
        exact: 'x-sfdcorgrelay',
        title: 'X-SFDCOrgRelay',
        description: 'Salesforce Email Relay org marker.',
        why: 'Its presence suggests Salesforce Email Relay was involved in delivery.',
        howToRead: 'Usually contains the org ID used by the relay layer for validation.'
      },
      {
        exact: 'x-sfdc-app',
        title: 'X-SFDC-App',
        description: 'Salesforce application that sent the message.',
        why: 'Can distinguish production from sandbox or reveal which Salesforce app surface generated the email.',
        howToRead: 'Common values include coreapp and coreapp-sandbox.'
      },
      {
        exact: 'x-sfdc-emailcategory',
        title: 'X-SFDC-EmailCategory',
        description: 'Salesforce trigger or email category.',
        why: 'Helps explain what workflow or product event caused the email to send.',
        howToRead: 'Look for category names such as workflowActionAlert or other internal Salesforce labels.'
      },
      {
        exact: 'x-sfdc-interface',
        title: 'X-SFDC-Interface',
        description: 'Salesforce sending interface marker.',
        why: 'Useful as a platform-routing clue when reconstructing how the email left Salesforce.',
        howToRead: 'Often shows whether the message was sent via internal Salesforce infrastructure.'
      },
      {
        exact: 'x-sfdc-tls-status',
        title: 'X-SFDC-TLS-STATUS',
        description: 'Whether Salesforce used TLS for delivery.',
        why: 'Provides a direct transport-encryption signal from Salesforce mail delivery.',
        howToRead: 'true means TLS was used; false means it was not.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-sfdc-tls-cipher',
        title: 'X-SFDC-TLS-CIPHER',
        description: 'TLS cipher suite used for Salesforce delivery.',
        why: 'Useful for transport diagnostics and encryption validation.',
        howToRead: 'Expect a cipher suite such as ECDHE-RSA-AES256-GCM-SHA384, or None if TLS was not used.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-sfdc-tls-version',
        title: 'X-SFDC-TLS-VERSION',
        description: 'TLS protocol version used for Salesforce delivery.',
        why: 'Confirms the transport protocol level in use.',
        howToRead: 'Typical values are TLSv1.2 or TLSv1.3.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-sfdc-tls-norelay',
        title: 'X-SFDC-TLS-NoRelay',
        description: 'Signals that Salesforce Email Relay should not re-relay this message.',
        why: 'Helps explain relay behavior when Salesforce mail traverses a relay configuration.',
        howToRead: 'A value like 1 usually indicates relay bypass was requested.'
      },
      {
        exact: 'x-sfdc-tls-verified',
        title: 'X-SFDC-TLS-VERIFIED',
        description: 'Whether TLS certificate verification succeeded.',
        why: 'Adds more nuance than plain TLS usage alone by indicating validation outcome.',
        howToRead: 'Common values are yes or no.'
      },
      {
        prefix: 'x-sfdc-x-',
        title: 'X-SFDC-X-*',
        description: 'Custom Visualforce or Apex email header added by Salesforce template logic.',
        why: 'These headers can carry application-specific business context that is useful during investigations.',
        howToRead: 'Everything after X-SFDC-X- is the custom header name that Salesforce derived from template configuration.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-sfdc-original-rcpt',
        title: 'X-SFDC-Original-RCPT',
        description: 'Inbound-only Salesforce recipient marker used by Email-to-Case or Email-to-Apex flows.',
        why: 'Can explain how Salesforce routed an inbound message, but it is undocumented and unsupported.',
        howToRead: 'Treat as an internal inbound-routing field whose format may change without notice.',
        references: [{ label: 'Salesforce Help caveat', url: SALESFORCE_INBOUND_CAVEAT }]
      },
      {
        exact: 'x-sender',
        title: 'X-Sender',
        description: 'Standard header Salesforce often sets to postmaster@salesforce.com.',
        why: 'Useful as a weak platform clue when seen alongside stronger X-SFDC headers.',
        howToRead: 'Do not rely on this alone for attribution; pair it with X-SFDC headers.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      },
      {
        exact: 'x-mail_abuse_inquiries',
        title: 'X-mail_abuse_inquiries',
        description: 'Salesforce abuse-reporting reference header.',
        why: 'Shows the provider abuse-reporting path used for Salesforce-originated mail.',
        howToRead: 'Usually contains a Salesforce abuse-reporting URL.'
      },
      {
        exact: 'sender',
        valuePattern: /<no-reply@salesforce\.com>|no-reply@salesforce\.com/i,
        title: 'Sender: no-reply@salesforce.com',
        description: 'Sender header commonly used by Salesforce org-wide email delivery.',
        why: 'Useful as supporting evidence that Salesforce infrastructure sent the message.',
        howToRead: 'Use it as a secondary clue only; the stronger identifiers are X-SFDC-LK and related headers.',
        references: [{ label: 'Salesforce developer docs', url: SALESFORCE_EMAIL_HEADER_DOC }]
      }
    ]
  },
  {
    id: 'sfmc',
    name: 'Salesforce Marketing Cloud',
    summary:
      'SFMC exposes limited SMTP diagnostics, but stack headers can still help identify the sending platform.',
    note:
      'SFMC often relies on encoded return paths for bounce tracking; that context is helpful even when proprietary headers are sparse.',
    rules: [
      {
        exact: 'x-sfmc-stack',
        title: 'X-SFMC-Stack',
        description: 'Salesforce Marketing Cloud stack or pod identifier.',
        why: 'Can help support teams localize which SFMC environment handled the send.',
        howToRead: 'Values are usually short pod names such as S1.'
      },
      {
        headerName: 'return-path',
        valuePattern: /<[^>]+@\s*bounce\.[^>]+>|^[^@\s]+\.[^@\s]+\.[^@\s]+@bounce\./i,
        title: 'Return-Path with SFMC bounce encoding',
        description: 'Marketing Cloud bounce address that commonly encodes Subscriber ID, Job ID, and MID.',
        why: 'Useful for identifying SFMC-originated mail and understanding which business unit and send job produced it.',
        howToRead: 'A pattern like SubscriberID.JobID.MID@bounce.example.com is a strong SFMC clue.'
      }
    ]
  }
]

function getMatchingRule(
  provider: ProviderDefinition,
  header: HeaderEntry
): ProviderHeaderRule | undefined {
  const lowerName = header.name.toLowerCase()

  return provider.rules.find((rule) => {
    if (rule.exact && lowerName === rule.exact) {
      return rule.valuePattern ? rule.valuePattern.test(header.value) : true
    }
    if (rule.prefix && lowerName.startsWith(rule.prefix)) {
      return rule.valuePattern ? rule.valuePattern.test(header.value) : true
    }
    if (
      rule.headerName &&
      lowerName === rule.headerName &&
      rule.valuePattern?.test(header.value)
    ) {
      return true
    }
    return false
  })
}

export function getProviderHeaderGuide(
  headerName: string,
  headerValue?: string
): ProviderHeaderGuide | undefined {
  const header: HeaderEntry = {
    name: headerName,
    value: headerValue ?? ''
  }

  for (const provider of PROVIDER_DEFINITIONS) {
    const rule = getMatchingRule(provider, header)

    if (rule) {
      return {
        title: rule.title,
        description: rule.description,
        why: rule.why,
        howToRead: rule.howToRead,
        references: rule.references
      }
    }
  }

  return undefined
}

export function detectProviderHeaders(
  headers: HeaderEntry[]
): ProviderHeaderDetection[] {
  return PROVIDER_DEFINITIONS.map((provider) => {
    const matchedHeaders = headers.flatMap((header) => {
      const rule = getMatchingRule(provider, header)
      if (!rule) return []

      return [
        {
          name: header.name,
          value: header.value,
          guide: {
            title: rule.title,
            description: rule.description,
            why: rule.why,
            howToRead: rule.howToRead,
            references: rule.references
          }
        }
      ]
    })

    if (matchedHeaders.length === 0) return null

    return {
      providerId: provider.id,
      providerName: provider.name,
      summary: provider.summary,
      note: provider.note,
      matchedHeaders
    }
  }).filter((match): match is ProviderHeaderDetection => match !== null)
}
