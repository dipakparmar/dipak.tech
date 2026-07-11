import { describe, expect, test } from 'bun:test';
import { parseEmailHeaders } from './email-header-parser';
import {
  deriveLiveAuthLookupContext,
  extractDomainFromAddress
} from './message-auth-context';
import { parseSpfMechanisms, parseTagList } from './message-auth-live';

describe('message auth context', () => {
  test('extracts domains from mailbox-like values', () => {
    expect(extractDomainFromAddress('Sender <alerts@example.com>')).toBe(
      'example.com'
    );
    expect(extractDomainFromAddress('<bounce.mail.example.com>')).toBeNull();
  });

  test('derives live lookup context from common auth headers', () => {
    const parsed = parseEmailHeaders(`From: Sender <sender@example.com>
Return-Path: <bounce@example.com>
Authentication-Results: mx.google.com;
        dkim=pass header.i=@example.com header.s=selector1 header.b=abc123;
        spf=pass smtp.mailfrom=bounce.example.com;
        dmarc=pass header.from=example.com
Received-SPF: pass (google.com: domain of bounce.example.com designates 198.51.100.42 as permitted sender) client-ip=198.51.100.42;
DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=selector1;
`);

    const context = deriveLiveAuthLookupContext(
      parsed.headers,
      parsed.authentication,
      parsed.summary.from
    );

    expect(context.fromDomain).toBe('example.com');
    expect(context.returnPathDomain).toBe('example.com');
    expect(context.spfDomain).toBe('bounce.example.com');
    expect(context.spfClientIp).toBe('198.51.100.42');
    expect(context.dkimSignatures).toEqual([
      { domain: 'example.com', selector: 'selector1' }
    ]);
  });

  test('preserves bare SPF domains from auth context', () => {
    const parsed = parseEmailHeaders(`From: Sender <sender@example.com>
Authentication-Results: mx.google.com;
        spf=pass smtp.mailfrom=bounce.example.com;
`);

    const context = deriveLiveAuthLookupContext(
      parsed.headers,
      parsed.authentication,
      parsed.summary.from
    );

    expect(context.spfDomain).toBe('bounce.example.com');
  });
});

describe('message auth live parsers', () => {
  test('parses DMARC or DKIM tag lists', () => {
    expect(parseTagList('v=DMARC1; p=reject; aspf=s')).toEqual({
      v: 'DMARC1',
      p: 'reject',
      aspf: 's'
    });
  });

  test('parses SPF mechanisms into rows', () => {
    expect(parseSpfMechanisms('v=spf1 include:_spf.google.com -all')).toEqual([
      {
        prefix: '',
        type: 'include',
        value: '_spf.google.com',
        prefixDescription: 'Pass',
        description:
          "Matches when the included domain's SPF evaluation returns pass."
      },
      {
        prefix: '-',
        type: 'all',
        value: '',
        prefixDescription: 'Fail',
        description:
          'Always matches. It should appear at the end of the record.'
      }
    ]);
  });
});
