import { describe, expect, test } from 'bun:test';
import {
  parseAuthenticationResults,
  parseAuthenticationResultsValue,
  parseEmailHeaders
} from './email-header-parser';

describe('authentication results parsing', () => {
  test('parses generic authentication-result properties', () => {
    const parsed = parseEmailHeaders(`Authentication-Results: mx.google.com;
        spf=pass smtp.mailfrom=bounce.example.com;
        dkim=pass header.d=example.com header.s=selector1;
        dmarc=pass header.from=example.com
`);

    expect(parsed.authentication.server).toBe('mx.google.com');
    expect(parsed.authentication.results).toHaveLength(3);
    expect(
      parsed.authentication.results[0]?.properties?.['smtp.mailfrom']
    ).toBe('bounce.example.com');
    expect(parsed.authentication.results[1]?.properties?.['header.d']).toBe(
      'example.com'
    );
    expect(parsed.authentication.results[2]?.properties?.['header.from']).toBe(
      'example.com'
    );
    expect(
      parsed.authentication.results.every((result) => !result.explanation)
    ).toBe(true);
  });

  test('parses microsoft compauth and dmarc explanations', () => {
    const authentication = parseAuthenticationResults([
      {
        name: 'Authentication-Results',
        value:
          'DM6PR01MB1234.prod.outlook.com; spf=pass smtp.mailfrom=example.com; dmarc=fail action=oreject header.from=example.com; compauth=fail reason=001'
      },
      { name: 'X-Forefront-Antispam-Report', value: 'SCL:5; SFV:SPM;' }
    ]);

    const dmarc = authentication.results.find(
      (result) => result.method === 'dmarc'
    );
    const compauth = authentication.results.find(
      (result) => result.method === 'compauth'
    );

    expect(dmarc?.properties?.action).toBe('oreject');
    expect(dmarc?.explanation).toContain('reject-style outcome');
    expect(compauth?.properties?.reason).toBe('001');
    expect(compauth?.explanation).toContain('Reason 001');
  });

  test('parses arc authentication-results values directly', () => {
    const parsed = parseAuthenticationResultsValue(
      'mx.zohomail.com; spf=pass smtp.mailfrom=example.com; dkim=pass header.d=example.com'
    );

    expect(parsed.server).toBe('mx.zohomail.com');
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]?.properties?.['smtp.mailfrom']).toBe(
      'example.com'
    );
  });
});
