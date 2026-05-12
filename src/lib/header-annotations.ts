import { getProviderHeaderGuide } from '@/lib/provider-headers'

export interface AnnotationReference {
  label: string
  url: string
}

export interface AnnotationInfo {
  title: string
  description: string
  why: string
  howToRead: string
  references?: AnnotationReference[]
}

const RFC_5322 = 'https://datatracker.ietf.org/doc/html/rfc5322'
const RFC_2045 = 'https://datatracker.ietf.org/doc/html/rfc2045'
const RFC_2369 = 'https://datatracker.ietf.org/doc/html/rfc2369'
const RFC_8058 = 'https://datatracker.ietf.org/doc/html/rfc8058'
const RFC_8601 = 'https://datatracker.ietf.org/doc/html/rfc8601'
const RFC_7208 = 'https://datatracker.ietf.org/doc/html/rfc7208'
const RFC_6376 = 'https://datatracker.ietf.org/doc/html/rfc6376'
const RFC_7489 = 'https://datatracker.ietf.org/doc/rfc7489/'
const RFC_8617 = 'https://datatracker.ietf.org/doc/html/rfc8617'

const REF_5322 = [{ label: 'RFC 5322', url: RFC_5322 }]

export const INFO_BY_HEADER: Record<string, AnnotationInfo> = {
  from: {
    title: "From",
    description:
      "The visible sender identity shown to recipients in their mail client.",
    why: "Attackers commonly forge this field to impersonate trusted senders. Always cross-reference with authentication results.",
    howToRead:
      "Check whether the domain matches Return-Path and SPF/DKIM/DMARC results. A mismatch can indicate spoofing.",
    references: REF_5322,
  },
  to: {
    title: "To",
    description: "The primary recipients listed in the email message.",
    why: "Confirms who the message was addressed to. Mass phishing may use generic or hidden recipients.",
    howToRead:
      "Verify these are expected. An empty To field in a message you received can indicate BCC delivery.",
  },
  subject: {
    title: "Subject",
    description: "The human-readable topic line of the message.",
    why: "Phishing emails often use urgent or alarming subjects to provoke quick action without scrutiny.",
    howToRead:
      "Look for urgency tactics, unusual formatting, or subjects that don't match the actual content.",
  },
  date: {
    title: "Date",
    description: "The timestamp declared by the sending mail client.",
    why: "A manipulated date can make emails appear sent at different times. Comparing with Received timestamps reveals discrepancies.",
    howToRead:
      "Compare with the earliest Received header. Large gaps may indicate queuing or clock manipulation.",
    references: REF_5322,
  },
  "message-id": {
    title: "Message-ID",
    description: "A unique identifier assigned to this email message.",
    why: "Legitimate Message-IDs follow a consistent format tied to the sending domain. Malformed IDs can signal forged messages.",
    howToRead:
      "The domain part (after @) should relate to the sending infrastructure. Random or suspicious domains are a red flag.",
    references: REF_5322,
  },
  "return-path": {
    title: "Return-Path",
    description:
      "The envelope sender address used for bounce notifications.",
    why: "SPF checks are performed against this domain. A mismatch between From and Return-Path is common in forwarded or spoofed mail.",
    howToRead:
      "Compare with the From header. Differences are not always malicious but warrant checking SPF and DMARC alignment.",
    references: [
      { label: 'RFC 5322', url: RFC_5322 },
      { label: 'SPF RFC 7208', url: RFC_7208 }
    ],
  },
  "reply-to": {
    title: "Reply-To",
    description:
      "The address where replies are directed, which may differ from the From address.",
    why: "A common tactic is to set Reply-To to an attacker-controlled address while displaying a trusted From address.",
    howToRead:
      "If the Reply-To domain differs from From, investigate why. Legitimate uses include mailing lists and no-reply senders.",
  },
  cc: {
    title: "Cc",
    description:
      "Carbon-copy recipients who receive the message visibly alongside the primary recipients.",
    why: "Shows who else received the email. Cc'd addresses are visible to all recipients, unlike Bcc.",
    howToRead:
      "Check if the Cc recipients are expected. Unusual Cc addresses in sensitive emails can indicate a leak or phishing.",
  },
  bcc: {
    title: "Bcc",
    description:
      "Blind carbon-copy recipients who are hidden from other recipients.",
    why: "Bcc is rarely visible in headers. Its presence here means this copy was the Bcc'd version, which is unusual to see.",
    howToRead:
      "Bcc headers are typically stripped before delivery. Seeing one may indicate a misconfigured server or a diagnostic copy.",
  },
  received: {
    title: "Received",
    description:
      "A per-hop delivery trace added by each mail server that handled the message.",
    why: "These reveal the actual delivery path. Forged entries can be inserted, but the topmost entries (added by your server) are trustworthy.",
    howToRead:
      "Read from bottom (oldest) to top (newest). Each hop shows which server passed the message to which.",
    references: REF_5322,
  },
  "authentication-results": {
    title: "Authentication-Results",
    description:
      "The receiving server's verdict on SPF, DKIM, and DMARC checks.",
    why: "This is the authoritative record of authentication. Failures here are the strongest signal of potential spoofing.",
    howToRead:
      'Look for pass/fail next to spf=, dkim=, and dmarc=. Results other than "pass" deserve attention.',
    references: [{ label: 'RFC 8601', url: RFC_8601 }],
  },
  "dkim-signature": {
    title: "DKIM-Signature",
    description:
      "A cryptographic signature proving that specific headers and body content were not altered in transit.",
    why: "A valid DKIM signature means the content hasn't been tampered with since signing.",
    howToRead:
      "The d= field shows the signing domain. Pair with the DKIM result in Authentication-Results to verify validity.",
    references: [{ label: 'DKIM RFC 6376', url: RFC_6376 }],
  },
  "received-spf": {
    title: "Received-SPF",
    description:
      "The SPF evaluation result from a receiving server, often with detailed diagnostic info.",
    why: "SPF verifies that the sending IP was authorized by the domain's DNS policy. Failures mean the IP is not on the allowed list.",
    howToRead:
      "The first word is the result. Details after it explain which mechanism matched or why it failed.",
    references: [{ label: 'SPF RFC 7208', url: RFC_7208 }],
  },
  "arc-authentication-results": {
    title: "ARC-Authentication-Results",
    description:
      "Authentication results preserved across forwarding hops using the ARC (Authenticated Received Chain) protocol.",
    why: "When email is forwarded, original SPF/DKIM may break. ARC preserves the authentication state from earlier hops.",
    howToRead:
      "Check ARC results alongside standard Authentication-Results. ARC helps distinguish legitimate forwarding from spoofing.",
    references: [{ label: 'ARC RFC 8617', url: RFC_8617 }],
  },
  "x-originating-ip": {
    title: "X-Originating-IP",
    description:
      "The IP address of the client that originally submitted the email.",
    why: "Reveals the true origin IP of the sender, which can differ from server IPs in Received headers.",
    howToRead:
      "Look up this IP to determine the sender's geographic location and network. VPNs or proxies may mask the true origin.",
  },
  "x-mailer": {
    title: "X-Mailer",
    description:
      "The email client or software used to compose the message.",
    why: "Can help identify the sending platform. Unusual mailer strings in enterprise email may indicate spoofing.",
    howToRead:
      "Compare with expected software for the sender. Bulk phishing tools sometimes leave distinctive X-Mailer values.",
  },
  "mime-version": {
    title: "MIME-Version",
    description:
      "Declares the MIME version used to format the message body and attachments.",
    why: "Almost always '1.0'. Its absence or unusual values may indicate a misconfigured or very old sending system.",
    howToRead:
      "Should be '1.0'. Any other value is non-standard and worth noting.",
    references: [{ label: 'MIME RFC 2045', url: RFC_2045 }],
  },
  "content-type": {
    title: "Content-Type",
    description:
      "Specifies the media type of the message body (e.g., text/plain, multipart/mixed).",
    why: "Determines how the email client renders the message. Multipart types contain boundaries separating body parts and attachments.",
    howToRead:
      "text/plain = plain text, text/html = HTML, multipart/* = message has multiple parts (body + attachments).",
    references: [{ label: 'MIME RFC 2045', url: RFC_2045 }],
  },
  "content-transfer-encoding": {
    title: "Content-Transfer-Encoding",
    description:
      "Specifies how the message body is encoded for safe transport (e.g., base64, quoted-printable).",
    why: "Email transport is 7-bit ASCII. This header ensures binary or Unicode content survives delivery intact.",
    howToRead:
      "7bit/8bit = minimal encoding, quoted-printable = readable encoding for text, base64 = binary-safe encoding.",
    references: [{ label: 'MIME RFC 2045', url: RFC_2045 }],
  },
  "x-google-dkim-signature": {
    title: "X-Google-DKIM-Signature",
    description:
      "Google's internal DKIM signature used for their own mail infrastructure tracking.",
    why: "Provides an additional layer of authentication specific to Google's systems. Useful for verifying Google-originated mail.",
    howToRead:
      "Similar format to standard DKIM-Signature. The d= domain will be a Google internal domain.",
  },
  "x-gm-message-state": {
    title: "X-Gm-Message-State",
    description:
      "Internal Gmail message state tracking token.",
    why: "Used by Gmail infrastructure for message processing. Contains no user-readable information.",
    howToRead:
      "This is an opaque token. Its presence confirms the message was processed by Gmail servers.",
  },
  "x-google-smtp-source": {
    title: "X-Google-SMTP-Source",
    description:
      "Identifies the Google SMTP source that processed this message.",
    why: "Confirms the message passed through Google's SMTP infrastructure.",
    howToRead:
      "An opaque identifier. Its presence confirms Google SMTP processing.",
  },
  "x-received": {
    title: "X-Received",
    description:
      "An internal received trace header added by major providers like Google.",
    why: "Provides additional routing information within a provider's internal infrastructure.",
    howToRead:
      "Read like a standard Received header. Shows internal server-to-server handoffs within the provider.",
  },
  "x-ms-exchange-organization-authas": {
    title: "X-MS-Exchange-Organization-AuthAs",
    description:
      "Microsoft Exchange authentication type for the message submission.",
    why: "Indicates how the sender authenticated to the Exchange server (Anonymous, Internal, External).",
    howToRead:
      "Internal = authenticated Exchange user, Anonymous = unauthenticated submission.",
  },
  "x-ms-exchange-organization-authsource": {
    title: "X-MS-Exchange-Organization-AuthSource",
    description:
      "The Exchange server that authenticated the sender.",
    why: "Identifies which Microsoft Exchange server handled authentication. Useful for tracing within Exchange organizations.",
    howToRead:
      "Shows the FQDN of the authenticating Exchange server.",
  },
  "x-microsoft-antispam": {
    title: "X-Microsoft-Antispam",
    description:
      "Microsoft's spam filtering verdict and scoring details.",
    why: "Contains the Bulk Complaint Level (BCL) and other filtering signals used by Microsoft 365.",
    howToRead:
      "BCL:0 = not bulk, BCL:9 = highly likely bulk. Other fields show filtering categories.",
  },
  "x-forefront-antispam-report": {
    title: "X-Forefront-Antispam-Report",
    description:
      "Detailed anti-spam analysis from Microsoft Forefront Protection.",
    why: "Provides granular spam filtering details including country of origin, language, and spam confidence level.",
    howToRead:
      "SCL (Spam Confidence Level) ranges from -1 (trusted) to 9 (spam). CIP shows the connecting IP.",
  },
  "list-unsubscribe": {
    title: "List-Unsubscribe",
    description:
      "Provides a mechanism for recipients to unsubscribe from mailing lists.",
    why: "Legitimate bulk senders include this. Its absence in marketing email may indicate spam.",
    howToRead:
      "Contains a mailto: or https: URL. Email clients may show an 'Unsubscribe' button based on this.",
    references: [
      { label: 'RFC 2369', url: RFC_2369 },
      { label: 'RFC 8058', url: RFC_8058 }
    ],
  },
  "list-id": {
    title: "List-Id",
    description:
      "Identifies the mailing list that distributed this message.",
    why: "Helps distinguish mailing list traffic from direct email. Used by email clients for filtering.",
    howToRead:
      "Shows the list name and domain. Useful for creating mail filters.",
    references: [{ label: 'RFC 2369', url: RFC_2369 }],
  },
  "x-spam-status": {
    title: "X-Spam-Status",
    description:
      "SpamAssassin or similar filter verdict with score and matched rules.",
    why: "Shows whether the message was flagged as spam and which rules triggered.",
    howToRead:
      "Yes/No indicates spam verdict. Score shows confidence. Rules list explains why.",
  },
  "x-spam-score": {
    title: "X-Spam-Score",
    description:
      "Numeric spam confidence score from the filtering system.",
    why: "Higher scores indicate higher spam probability. Thresholds vary by system.",
    howToRead:
      "Typically 0-10+. Below 3 is usually clean, above 5 is likely spam. Exact thresholds depend on configuration.",
  },
  "x-virus-scanned": {
    title: "X-Virus-Scanned",
    description:
      "Indicates the message was scanned by an antivirus system.",
    why: "Confirms antivirus scanning occurred during delivery. Its absence doesn't mean no scanning happened.",
    howToRead:
      "Shows the scanning software name/version. The message passed if this header is present without a quarantine notice.",
  },
  "x-priority": {
    title: "X-Priority",
    description:
      "The sender-declared priority level of the message.",
    why: "Can be set to any value by the sender. High priority in unexpected contexts may be a social engineering tactic.",
    howToRead:
      "1 = Highest, 3 = Normal, 5 = Lowest. Often abused by spam to trigger urgency.",
  },
  importance: {
    title: "Importance",
    description:
      "Another priority indicator, commonly used by Microsoft email clients.",
    why: "Like X-Priority, this is sender-controlled and can be used to create false urgency.",
    howToRead:
      "Values: high, normal, low. Treat sender-declared importance with appropriate skepticism.",
  },
  "arc-seal": {
    title: "ARC-Seal",
    description:
      "Cryptographic seal in the Authenticated Received Chain, binding ARC headers together.",
    why: "Ensures ARC authentication results haven't been tampered with across forwarding hops.",
    howToRead:
      "Contains cv= (chain validation: pass/fail/none) and i= (instance number in the chain).",
  },
  "arc-message-signature": {
    title: "ARC-Message-Signature",
    description:
      "A DKIM-like signature over the message as part of the ARC chain.",
    why: "Preserves message integrity proof across forwards where standard DKIM would break.",
    howToRead:
      "Format matches DKIM-Signature. The i= value indicates which ARC hop created this signature.",
  },
  "feedback-id": {
    title: "Feedback-ID",
    description:
      "An identifier used by email senders to track feedback loop reports.",
    why: "Used by large senders (like Google, Amazon SES) to correlate spam complaints back to specific campaigns.",
    howToRead:
      "Colon-separated values identifying the campaign, sender, and sending infrastructure.",
  },
  "list-unsubscribe-post": {
    title: "List-Unsubscribe-Post",
    description:
      "Signals support for one-click HTTP POST unsubscribe on list mail.",
    why: "Used by modern bulk senders so mailbox providers can offer safer, streamlined unsubscribe flows.",
    howToRead:
      'The expected value is usually "List-Unsubscribe=One-Click". It should accompany a matching List-Unsubscribe header.',
    references: [{ label: 'RFC 8058', url: RFC_8058 }],
  },
}

export const INFO_BY_CARD: Record<string, AnnotationInfo> = {
  spf: {
    title: "SPF (Sender Policy Framework)",
    description:
      "Checks whether the sending server's IP is authorized by the domain's DNS SPF record.",
    why: "Prevents unauthorized servers from sending on behalf of a domain. Failure means the sender IP is not approved.",
    howToRead:
      "Pass = IP authorized. Fail/softfail = not authorized (higher spoofing risk). None = no SPF record exists.",
    references: [{ label: 'SPF RFC 7208', url: RFC_7208 }],
  },
  dkim: {
    title: "DKIM (DomainKeys Identified Mail)",
    description:
      "Verifies a cryptographic signature to confirm the email was not modified after sending.",
    why: "Provides tamper detection. A valid signature means signed content arrived intact from the signing domain.",
    howToRead:
      "Pass = signature valid, content intact. Fail = verification failed, content may have been altered.",
    references: [{ label: 'DKIM RFC 6376', url: RFC_6376 }],
  },
  dmarc: {
    title: "DMARC (Domain-based Message Authentication)",
    description:
      "A policy layer requiring the From domain to align with either SPF or DKIM authentication.",
    why: "Closes the gap between SPF/DKIM and the visible From address. Prevents passing SPF with a different domain.",
    howToRead:
      "Pass = From domain aligns with authenticated domain. Fail = alignment broken, increasing spoofing risk.",
    references: [{ label: 'DMARC RFC 7489', url: RFC_7489 }],
  },
  "received-hops": {
    title: "Received Hops",
    description:
      "The number of mail servers that handled this message between sender and your inbox.",
    why: "Each hop adds latency and is a point where the message could be inspected or modified.",
    howToRead:
      "2-5 hops is typical. More than 7 may indicate complex routing or forwarding chains.",
  },
}

export function getHeaderAnnotation(
  headerName: string,
  headerValue?: string
): AnnotationInfo | undefined {
  return (
    INFO_BY_HEADER[headerName.toLowerCase()] ??
    getProviderHeaderGuide(headerName, headerValue)
  )
}

export function getCardAnnotation(
  cardKey: string
): AnnotationInfo | undefined {
  return INFO_BY_CARD[cardKey.toLowerCase()]
}
