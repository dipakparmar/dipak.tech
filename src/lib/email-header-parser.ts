// Types

export interface ParsedHeaders {
  headers: HeaderEntry[];
  summary: EmailSummary;
  hops: Hop[];
  authentication: AuthenticationResults;
  totalDeliveryTime: number | null;
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
}

export interface AuthenticationResults {
  server: string | null;
  results: AuthResult[];
}

// Main parsing function

export function parseEmailHeaders(rawHeaders: string): ParsedHeaders {
  const headers = parseRawHeaders(rawHeaders);
  const summary = extractSummary(headers);
  const hops = extractHops(headers);
  const authentication = parseAuthenticationResults(headers);

  let totalDeliveryTime: number | null = null;
  if (hops.length >= 2) {
    const first = hops[0]?.timestamp;
    const last = hops[hops.length - 1]?.timestamp;
    if (first && last) {
      totalDeliveryTime = last.getTime() - first.getTime();
    }
  }

  return { headers, summary, hops, authentication, totalDeliveryTime };
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
      merged[merged.length - 1] += " " + line.trim();
    } else {
      merged.push(line);
    }
  }

  const headers: HeaderEntry[] = [];
  for (const line of merged) {
    const colonIndex = line.indexOf(":");
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
    from: find(["From"]),
    to: find(["To"]),
    subject: find(["Subject"]),
    date: find(["Date"]),
    messageId: find(["Message-ID", "Message-Id"]),
    mailer: find(["X-Mailer", "User-Agent"]),
    replyTo: find(["Reply-To"]),
    contentType: find(["Content-Type"]),
    spamScore: find(["X-Spam-Score", "X-Spam-Status"]),
  };
}

// Extract and parse Received hops

export function extractHops(headers: HeaderEntry[]): Hop[] {
  const receivedHeaders = headers.filter(
    (h) => h.name.toLowerCase() === "received"
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
    const semiIndex = raw.lastIndexOf(";");
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
      rawHeader: raw,
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

export function parseAuthenticationResults(
  headers: HeaderEntry[]
): AuthenticationResults {
  const authHeader = headers.find(
    (h) => h.name.toLowerCase() === "authentication-results"
  );

  if (!authHeader) {
    return { server: null, results: [] };
  }

  const value = authHeader.value;
  const parts = value.split(";").map((s) => s.trim());

  const server = parts[0] || null;
  const results: AuthResult[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Match patterns like "spf=pass", "dkim=pass", "dmarc=pass"
    const match = part.match(/^(\w+)\s*=\s*(\w+)/);
    if (match) {
      results.push({
        method: match[1],
        result: match[2],
        detail: part,
      });
    }
  }

  return { server, results };
}

// Format delay in milliseconds to human-readable string

export function formatDelay(ms: number): string {
  const absMs = Math.abs(ms);

  if (absMs < 1000) {
    return "<1 sec";
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
X-Spam-Status: No, score=-2.1 required=5.0 tests=BAYES_00,DKIM_SIGNED,DKIM_VALID,DKIM_VALID_AU,RCVD_IN_DNSWL_NONE,SPF_HELO_NONE,SPF_PASS autolearn=ham autolearn_force=no version=3.4.6`;
