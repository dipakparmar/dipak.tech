export const PROVIDER_LOGO_DOMAINS = {
  sendgrid: 'sendgrid.com',
  mailchimp: 'mailchimp.com',
  mandrill: 'mailchimp.com',
  postmark: 'postmarkapp.com',
  mailgun: 'mailgun.com',
  brevo: 'brevo.com',
  ses: 'aws.amazon.com',
  microsoft365: 'microsoft.com',
  hubspot: 'hubspot.com',
  'salesforce-core': 'salesforce.com',
  sfmc: 'salesforce.com',
  github: 'github.com',
  'zoho-mail': 'zoho.com'
} as const;

export type ProviderLogoId = keyof typeof PROVIDER_LOGO_DOMAINS;
export type ProviderLogoTheme = 'light' | 'dark';

function getPublicLogoDevToken(): string | null {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();
  return token ? token : null;
}

/** logo.dev URL for any domain, or null when no token is configured. */
export function getDomainLogoSrc(domain: string, size = 32): string | null {
  const token = getPublicLogoDevToken();
  if (!token) return null;
  const params = new URLSearchParams({
    token,
    size: String(size),
    format: 'png',
    retina: 'true',
    fallback: '404'
  });
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

export function isProviderLogoId(value: string): value is ProviderLogoId {
  return value in PROVIDER_LOGO_DOMAINS;
}

export function getProviderLogoDomain(providerId: ProviderLogoId): string {
  return PROVIDER_LOGO_DOMAINS[providerId];
}

export function getProviderLogoSrc(
  providerId: string,
  theme?: ProviderLogoTheme
): string | null {
  if (!isProviderLogoId(providerId)) return null;

  const token = getPublicLogoDevToken();
  if (!token) return null;

  return getProviderLogoUrl(providerId, token, theme);
}

function getProviderLogoUrl(
  providerId: ProviderLogoId,
  token: string,
  theme?: ProviderLogoTheme
): string {
  const params = new URLSearchParams({
    token,
    size: '80',
    format: 'png',
    retina: 'true',
    fallback: '404'
  });

  if (theme) {
    params.set('theme', theme);
  }

  return `https://img.logo.dev/${getProviderLogoDomain(providerId)}?${params.toString()}`;
}
