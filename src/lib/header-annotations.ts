export interface AnnotationInfo {
  title: string
  description: string
  why: string
  howToRead: string
}

export const INFO_BY_HEADER: Record<string, AnnotationInfo> = {
  from: {
    title: "From",
    description:
      "The visible sender identity shown to recipients in their mail client.",
    why: "Attackers commonly forge this field to impersonate trusted senders. Always cross-reference with authentication results.",
    howToRead:
      "Check whether the domain matches Return-Path and SPF/DKIM/DMARC results. A mismatch can indicate spoofing.",
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
  },
  "message-id": {
    title: "Message-ID",
    description: "A unique identifier assigned to this email message.",
    why: "Legitimate Message-IDs follow a consistent format tied to the sending domain. Malformed IDs can signal forged messages.",
    howToRead:
      "The domain part (after @) should relate to the sending infrastructure. Random or suspicious domains are a red flag.",
  },
  "return-path": {
    title: "Return-Path",
    description:
      "The envelope sender address used for bounce notifications.",
    why: "SPF checks are performed against this domain. A mismatch between From and Return-Path is common in forwarded or spoofed mail.",
    howToRead:
      "Compare with the From header. Differences are not always malicious but warrant checking SPF and DMARC alignment.",
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
  },
  "authentication-results": {
    title: "Authentication-Results",
    description:
      "The receiving server's verdict on SPF, DKIM, and DMARC checks.",
    why: "This is the authoritative record of authentication. Failures here are the strongest signal of potential spoofing.",
    howToRead:
      'Look for pass/fail next to spf=, dkim=, and dmarc=. Results other than "pass" deserve attention.',
  },
  "dkim-signature": {
    title: "DKIM-Signature",
    description:
      "A cryptographic signature proving that specific headers and body content were not altered in transit.",
    why: "A valid DKIM signature means the content hasn't been tampered with since signing.",
    howToRead:
      "The d= field shows the signing domain. Pair with the DKIM result in Authentication-Results to verify validity.",
  },
  "received-spf": {
    title: "Received-SPF",
    description:
      "The SPF evaluation result from a receiving server, often with detailed diagnostic info.",
    why: "SPF verifies that the sending IP was authorized by the domain's DNS policy. Failures mean the IP is not on the allowed list.",
    howToRead:
      "The first word is the result. Details after it explain which mechanism matched or why it failed.",
  },
  "arc-authentication-results": {
    title: "ARC-Authentication-Results",
    description:
      "Authentication results preserved across forwarding hops using the ARC (Authenticated Received Chain) protocol.",
    why: "When email is forwarded, original SPF/DKIM may break. ARC preserves the authentication state from earlier hops.",
    howToRead:
      "Check ARC results alongside standard Authentication-Results. ARC helps distinguish legitimate forwarding from spoofing.",
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
  default: {
    title: "Header Field",
    description:
      "A metadata field attached to the email by a server or client in the delivery chain.",
    why: "Even lesser-known headers provide useful forensic context like the sending software, original IP, or scanning results.",
    howToRead:
      "Consider alongside neighboring headers for context. X-prefixed headers are non-standard extensions.",
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
  },
  dkim: {
    title: "DKIM (DomainKeys Identified Mail)",
    description:
      "Verifies a cryptographic signature to confirm the email was not modified after sending.",
    why: "Provides tamper detection. A valid signature means signed content arrived intact from the signing domain.",
    howToRead:
      "Pass = signature valid, content intact. Fail = verification failed, content may have been altered.",
  },
  dmarc: {
    title: "DMARC (Domain-based Message Authentication)",
    description:
      "A policy layer requiring the From domain to align with either SPF or DKIM authentication.",
    why: "Closes the gap between SPF/DKIM and the visible From address. Prevents passing SPF with a different domain.",
    howToRead:
      "Pass = From domain aligns with authenticated domain. Fail = alignment broken, increasing spoofing risk.",
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

export function getHeaderAnnotation(headerName: string): AnnotationInfo {
  const key = headerName.toLowerCase()
  return INFO_BY_HEADER[key] || INFO_BY_HEADER.default
}

export function getCardAnnotation(
  cardKey: string
): AnnotationInfo | undefined {
  return INFO_BY_CARD[cardKey.toLowerCase()]
}
