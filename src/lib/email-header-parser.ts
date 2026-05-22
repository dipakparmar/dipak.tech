// Types

export interface ParsedHeaders {
  headers: HeaderEntry[];
  summary: EmailSummary;
  hops: Hop[];
  authentication: AuthenticationResults;
  totalDeliveryTime: number | null;
  body: EmailBody | null;
}

export interface EmailBody {
  raw: string;
  html: string | null;
  plain: string | null;
  hasBody: boolean;
}

export interface HeaderEntry {
  name: string;
  value: string;
}

export interface EmailSummary {
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  mailer: string | null;
  replyTo: string | null;
  contentType: string | null;
  spamScore: string | null;
}

export interface Hop {
  index: number;
  from: string | null;
  by: string | null;
  with: string | null;
  timestamp: Date | null;
  delay: number | null;
  rawHeader: string;
}

export interface AuthResult {
  method: string;
  result: string;
  detail: string;
  properties?: Record<string, string>;
  explanation?: string;
}

export interface AuthenticationResults {
  server: string | null;
  results: AuthResult[];
}

function parseAuthResultProperties(detail: string): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const match of detail.matchAll(/([a-z][a-z0-9_.-]*)=([^\s;]+)/gi)) {
    const [, key, rawValue] = match;
    properties[key.toLowerCase()] = rawValue;
  }

  return properties;
}

function looksLikeMicrosoftAuthStamp(
  server: string | null,
  headers: HeaderEntry[]
): boolean {
  if (
    server &&
    /(outlook\.com|protection\.outlook\.com|microsoft)/i.test(server)
  ) {
    return true;
  }

  return headers.some((header) =>
    /^(x-microsoft-antispam|x-forefront-antispam-report|x-ms-exchange-|x-ms-office365-)/i.test(
      header.name
    )
  );
}

function getMicrosoftCompauthReason(reason: string): string | null {
  const direct: Record<string, string> = {
    '000':
      "DMARC failed and the domain's DMARC policy was quarantine or reject.",
    '001':
      'The sender lacked strong published authentication, so Microsoft treated the message as failing implicit authentication.',
    '002':
      'An organization policy explicitly blocks this sender/domain combination from spoofing.',
    '010':
      'DMARC failed for one of your own accepted domains, which usually indicates intra-org or self-spoofing.',
    '100':
      'SPF passed or DKIM passed, and the MAIL FROM and From domains aligned.',
    '101': 'The message was DKIM-signed by the visible From domain.',
    '102': 'The MAIL FROM and From domains aligned, and SPF passed.',
    '103': 'The From domain aligned with the PTR record of the source IP.',
    '104': 'The source IP PTR record aligned with the From domain.',
    '108':
      'DKIM failed only because a prior legitimate hop modified the message body.',
    '109':
      'No DMARC record existed, but the message still looked aligned enough to pass implicitly.',
    '111':
      'DMARC had a temporary or permanent error, but SPF or DKIM still aligned with the From domain.',
    '112':
      'A DNS timeout prevented Microsoft from retrieving the DMARC record.',
    '115':
      'The message came from a Microsoft 365 tenant where the From domain is an accepted domain.',
    '116': "The From domain's MX aligned with the PTR of the connecting IP.",
    '130':
      'A trusted ARC sealer overrode what would otherwise have been a DMARC failure.',
    '201':
      "The From domain aligned with the subnet associated with the connecting IP's PTR record.",
    '202':
      "The From domain aligned with the domain portion of the connecting IP's PTR record.",
    '501':
      'DMARC was not enforced because this was treated as a valid bounce/NDR in an already-established sender-recipient relationship.',
    '502':
      'DMARC was not enforced because this was a valid NDR for mail sent from this organization.',
    '601':
      'The sending domain is one of your own accepted domains, so Microsoft treated this as self-spoofing or intra-org spoofing.',
    '905':
      'DMARC was not enforced because routing was too complex, such as hybrid or third-party relay flow.'
  };

  if (direct[reason]) return direct[reason];

  const numeric = Number.parseInt(reason, 10);
  if (Number.isNaN(numeric)) return null;
  if (numeric >= 100 && numeric < 200)
    return 'The message passed explicit or implicit composite authentication.';
  if (numeric >= 200 && numeric < 300)
    return 'The message soft-passed implicit composite authentication.';
  if (numeric >= 300 && numeric < 500)
    return 'The message was not checked for composite authentication or bypassed it.';
  if (numeric >= 600 && numeric < 700)
    return 'The message failed implicit composite authentication.';
  if (numeric >= 700 && numeric < 705)
    return 'DMARC was not enforced because Microsoft had a history of legitimate mail from this sending infrastructure.';
  if (numeric >= 700 && numeric < 800)
    return 'The message passed implicit composite authentication.';
  if (numeric >= 900 && numeric < 1000)
    return 'The message bypassed composite authentication.';

  return null;
}

function getMicrosoftAuthExplanation(
  method: string,
  result: string,
  properties: Record<string, string>
): string | undefined {
  const normalizedMethod = method.toLowerCase();
  const normalizedResult = result.toLowerCase();

  if (normalizedMethod === 'compauth') {
    const reason = properties['reason'];
    const reasonExplanation = reason
      ? getMicrosoftCompauthReason(reason)
      : null;

    if (reason && reasonExplanation) {
      return `Microsoft composite authentication returned ${normalizedResult}. Reason ${reason}: ${reasonExplanation}`;
    }

    if (reason) {
      return `Microsoft composite authentication returned ${normalizedResult}. Reason ${reason} is Microsoft-specific composite auth detail.`;
    }

    return `Microsoft composite authentication returned ${normalizedResult}. This combines SPF, DKIM, DMARC, and other message signals using the visible From domain.`;
  }

  if (normalizedMethod === 'dmarc') {
    const action = properties['action']?.toLowerCase();
    if (!action) return undefined;

    const explanations: Record<string, string> = {
      none: 'Microsoft evaluated DMARC but did not enforce a failing policy action.',
      pct_quarantine:
        "The message failed DMARC, but Microsoft did not quarantine this sample because the sender's DMARC pct setting was below 100%.",
      'pct.quarantine':
        "The message failed DMARC, but Microsoft did not quarantine this sample because the sender's DMARC pct setting was below 100%.",
      pct_reject:
        "The message failed DMARC, but Microsoft did not reject this sample because the sender's DMARC pct setting was below 100%.",
      'pct.reject':
        "The message failed DMARC, but Microsoft did not reject this sample because the sender's DMARC pct setting was below 100%.",
      permerror:
        'Microsoft hit a permanent DMARC evaluation error, usually due to a malformed DMARC DNS record.',
      temperror:
        'Microsoft hit a temporary DMARC evaluation error, often DNS-related.',
      oreject:
        'The message failed DMARC and Microsoft enforced a reject-style outcome.'
    };

    return explanations[action] ?? `Microsoft recorded DMARC action ${action}.`;
  }

  if (normalizedMethod === 'spf' && normalizedResult === 'softfail') {
    return "SPF softfail means the sending IP was not authorized, but the sender's SPF policy asked receivers to accept and mark the message rather than hard reject it.";
  }

  if (normalizedMethod === 'dmarc' && normalizedResult === 'bestguesspass') {
    return 'Microsoft uses bestguesspass when no DMARC record exists but the message still looks aligned enough that it would likely pass DMARC if a record were published.';
  }

  return undefined;
}

// Main parsing function

export function parseEmailHeaders(rawHeaders: string): ParsedHeaders {
  const headers = parseRawHeaders(rawHeaders);
  const summary = extractSummary(headers);
  const hops = extractHops(headers);
  const authentication = parseAuthenticationResults(headers);
  const body = extractBody(rawHeaders, summary.contentType);

  let totalDeliveryTime: number | null = null;
  if (hops.length >= 2) {
    const first = hops[0]?.timestamp;
    const last = hops[hops.length - 1]?.timestamp;
    if (first && last) {
      totalDeliveryTime = last.getTime() - first.getTime();
    }
  }

  return { headers, summary, hops, authentication, totalDeliveryTime, body };
}

// Parse raw header text into HeaderEntry array

export function parseRawHeaders(raw: string): HeaderEntry[] {
  const lines = raw.split(/\r?\n/);
  const merged: string[] = [];

  for (const line of lines) {
    // A blank line separates headers from the message body — stop parsing
    if (line.length === 0 && merged.length > 0) break;
    if (line.length === 0) continue;
    // Continuation line: starts with whitespace
    if (/^\s/.test(line) && merged.length > 0) {
      merged[merged.length - 1] += ' ' + line.trim();
    } else {
      merged.push(line);
    }
  }

  const headers: HeaderEntry[] = [];
  for (const line of merged) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const name = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (name) {
      headers.push({ name, value });
    }
  }

  return headers;
}

// Extract summary fields from headers

export function extractSummary(headers: HeaderEntry[]): EmailSummary {
  const find = (names: string[]): string | null => {
    const lowerNames = names.map((n) => n.toLowerCase());
    for (const h of headers) {
      if (lowerNames.includes(h.name.toLowerCase())) {
        return h.value;
      }
    }
    return null;
  };

  return {
    from: find(['From']),
    to: find(['To']),
    subject: find(['Subject']),
    date: find(['Date']),
    messageId: find(['Message-ID', 'Message-Id']),
    mailer: find(['X-Mailer', 'User-Agent']),
    replyTo: find(['Reply-To']),
    contentType: find(['Content-Type']),
    spamScore: find(['X-Spam-Score', 'X-Spam-Status'])
  };
}

// Extract and parse Received hops

export function extractHops(headers: HeaderEntry[]): Hop[] {
  const receivedHeaders = headers.filter(
    (h) => h.name.toLowerCase() === 'received'
  );

  // Received headers are in reverse chronological order in the raw headers
  // (topmost = most recent). Reverse so index 0 = first hop (oldest).
  const reversed = [...receivedHeaders].reverse();

  const hops: Hop[] = reversed.map((h, i) => {
    const raw = h.value;

    const fromMatch = raw.match(/from\s+(\S+)/i);
    const byMatch = raw.match(/by\s+(\S+)/i);
    const withMatch = raw.match(/with\s+(\S+)/i);

    let timestamp: Date | null = null;
    const semiIndex = raw.lastIndexOf(';');
    if (semiIndex !== -1) {
      const dateStr = raw.slice(semiIndex + 1).trim();
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed;
      }
    }

    return {
      index: i,
      from: fromMatch ? fromMatch[1] : null,
      by: byMatch ? byMatch[1] : null,
      with: withMatch ? withMatch[1] : null,
      timestamp,
      delay: null,
      rawHeader: raw
    };
  });

  // Calculate delays between consecutive hops
  for (let i = 1; i < hops.length; i++) {
    const prev = hops[i - 1]?.timestamp;
    const curr = hops[i]?.timestamp;
    if (prev && curr) {
      hops[i].delay = curr.getTime() - prev.getTime();
    }
  }

  return hops;
}

// Parse Authentication-Results header

export function parseAuthenticationResultsValue(
  value: string
): AuthenticationResults {
  const parts = value.split(';').map((s) => s.trim());

  const server = parts[0] || null;
  const results: AuthResult[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Match patterns like "spf=pass", "dkim=pass", "dmarc=pass"
    const match = part.match(/^([a-z][a-z0-9_.-]*)\s*=\s*([a-z0-9_.-]+)/i);
    if (match) {
      const method = match[1];
      const result = match[2];
      const properties = parseAuthResultProperties(part);
      results.push({
        method,
        result,
        detail: part,
        properties,
        explanation: undefined
      });
    }
  }

  return { server, results };
}

export function parseAuthenticationResults(
  headers: HeaderEntry[]
): AuthenticationResults {
  const authHeader = headers.find((h) =>
    /^(authentication-results|arc-authentication-results)$/i.test(h.name)
  );

  if (!authHeader) {
    return { server: null, results: [] };
  }

  const parsed = parseAuthenticationResultsValue(authHeader.value);
  const isMicrosoftStamp = looksLikeMicrosoftAuthStamp(parsed.server, headers);

  return {
    server: parsed.server,
    results: parsed.results.map((result) => ({
      ...result,
      explanation: isMicrosoftStamp
        ? getMicrosoftAuthExplanation(
            result.method,
            result.result,
            result.properties ?? {}
          )
        : result.explanation
    }))
  };
}

// Extract email body from raw message

export function extractBody(
  raw: string,
  contentType: string | null
): EmailBody | null {
  // Find the blank line separating headers from body
  const separatorMatch = raw.match(/\r?\n\r?\n/);
  if (!separatorMatch || separatorMatch.index === undefined) {
    return null;
  }

  const bodyRaw = raw.slice(separatorMatch.index + separatorMatch[0].length);
  if (!bodyRaw.trim()) {
    return null;
  }

  let html: string | null = null;
  let plain: string | null = null;

  // Check if multipart
  const boundaryMatch = contentType?.match(/boundary="?([^";\s]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = bodyRaw.split(`--${boundary}`);

    for (const part of parts) {
      if (part.trim() === '' || part.trim() === '--') continue;

      // Split part headers from part body
      const partSep = part.match(/\r?\n\r?\n/);
      if (!partSep || partSep.index === undefined) continue;

      const partHeaders = part.slice(0, partSep.index).toLowerCase();
      const partBody = part.slice(partSep.index + partSep[0].length).trim();

      if (!partBody) continue;

      // Decode quoted-printable if needed
      const decoded = partHeaders.includes('quoted-printable')
        ? decodeQuotedPrintable(partBody)
        : partBody;

      if (partHeaders.includes('text/html')) {
        html = decoded;
      } else if (partHeaders.includes('text/plain')) {
        plain = decoded;
      }
    }
  } else if (contentType?.toLowerCase().includes('text/html')) {
    html = bodyRaw.trim();
  } else {
    // Default to plain text
    plain = bodyRaw.trim();
  }

  return { raw: bodyRaw, html, plain, hasBody: true };
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

// Format delay in milliseconds to human-readable string

export function formatDelay(ms: number): string {
  const absMs = Math.abs(ms);

  if (absMs < 1000) {
    return '<1 sec';
  }

  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`;
  }

  return `${seconds} sec`;
}

// Sample headers for testing/demo

export const SAMPLE_HEADERS = `Delivered-To: recipient@example.com
Received: by 2002:a05:7300:478a:b0:12b:a5c0:6e34 with SMTP id r10csp2145832dyk;
        Mon, 3 Mar 2026 09:15:42 -0800 (PST)
X-Received: by 2002:a17:906:c14:b0:a46:3b2c:e8a1 with SMTP id
        x20-20020a170906c00e00b00a463b2ce8a1mr1456372ejf.12.1709485542123;
        Mon, 3 Mar 2026 09:15:42 -0800 (PST)
ARC-Seal: i=1; a=rsa-sha256; t=1709485542; cv=none;
        d=google.com; s=arc-20240116;
        b=abc123def456
ARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240116;
        h=to:subject:message-id:date:from:mime-version:dkim-signature;
        bh=abc123=; b=def456=
ARC-Authentication-Results: i=1; mx.google.com;
        dkim=pass header.i=@example.com header.s=selector1 header.b=abc123;
        spf=pass (google.com: domain of sender@example.com designates 198.51.100.42 as permitted sender) smtp.mailfrom=sender@example.com;
        dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.com
Return-Path: <sender@example.com>
Received: from mail-ej1-f42.google.com (mail-ej1-f42.google.com. [198.51.100.42])
        by mx.google.com with ESMTPS id a1-20020a170906c00100b00a463b2ce8a1si1234567ejf.123.2026.03.03.09.15.41
        for <recipient@example.com>
        (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256);
        Mon, 3 Mar 2026 09:15:41 -0800 (PST)
Received-SPF: pass (google.com: domain of sender@example.com designates 198.51.100.42 as permitted sender) client-ip=198.51.100.42;
Authentication-Results: mx.google.com;
        dkim=pass header.i=@example.com header.s=selector1 header.b=abc123;
        spf=pass (google.com: domain of sender@example.com designates 198.51.100.42 as permitted sender) smtp.mailfrom=sender@example.com;
        dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.com
Received: from internal-relay.example.com (internal-relay.example.com [10.0.0.5])
        by mail-ej1-f42.google.com with ESMTP id abc123def456.789
        for <recipient@example.com>;
        Mon, 3 Mar 2026 09:15:38 -0800 (PST)
Received: from webserver.example.com (webserver.example.com [10.0.0.10])
        by internal-relay.example.com with ESMTP id xyz789
        for <recipient@example.com>;
        Mon, 3 Mar 2026 09:15:35 -0800 (PST)
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=example.com; s=selector1;
        h=from:to:subject:date:message-id:mime-version:content-type;
        bh=abcdef123456=;
        b=ghijkl789012abcdef345678=
X-Google-DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=1e100.net; s=20230601;
        h=to:subject:message-id:date:from:mime-version:content-type;
        bh=abcdef123456=;
        b=mnopqr567890=
X-Gm-Message-State: AOJu0YwABCDEF1234567890
X-Google-Smtp-Source: AGHT+ABCDEF1234567890
MIME-Version: 1.0
From: John Doe <sender@example.com>
Date: Mon, 3 Mar 2026 18:15:34 +0100
Message-ID: <CAGh5RzLm8nK4FzT+abc123@mail.gmail.com>
Subject: Quarterly Report - Q1 2026
To: Jane Smith <recipient@example.com>
Reply-To: John Doe <noreply@example.com>
Content-Type: multipart/alternative; boundary="000000000000abc123def456"
X-Mailer: Microsoft Outlook 16.0
X-Spam-Status: No, score=-2.1 required=5.0 tests=BAYES_00,DKIM_SIGNED,DKIM_VALID,DKIM_VALID_AU,RCVD_IN_DNSWL_NONE,SPF_HELO_NONE,SPF_PASS autolearn=ham autolearn_force=no version=3.4.6

--000000000000abc123def456
Content-Type: text/plain; charset="UTF-8"

Hi Jane,

Please find the Q1 2026 quarterly report attached. Key highlights:

- Revenue increased 15% YoY
- Customer acquisition cost decreased by 8%
- Net promoter score improved to 72

Let me know if you have any questions.

Best regards,
John Doe
Senior Analyst | Example Corp

--000000000000abc123def456
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

<html>
<head><style>body { font-family: Arial, sans-serif; color: #333; }</style></head>
<body>
<p>Hi Jane,</p>
<p>Please find the Q1 2026 quarterly report attached. Key highlights:</p>
<ul>
<li>Revenue increased <strong>15% YoY</strong></li>
<li>Customer acquisition cost decreased by <strong>8%</strong></li>
<li>Net promoter score improved to <strong>72</strong></li>
</ul>
<p>Let me know if you have any questions.</p>
<p>Best regards,<br>
<strong>John Doe</strong><br>
Senior Analyst | Example Corp</p>
</body>
</html>
--000000000000abc123def456--`;
