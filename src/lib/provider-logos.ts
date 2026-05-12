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
  sfmc: 'salesforce.com'
} as const

export type ProviderLogoId = keyof typeof PROVIDER_LOGO_DOMAINS
export type ProviderLogoTheme = 'light' | 'dark'

export function isProviderLogoId(value: string): value is ProviderLogoId {
  return value in PROVIDER_LOGO_DOMAINS
}

export function getProviderLogoDomain(providerId: ProviderLogoId): string {
  return PROVIDER_LOGO_DOMAINS[providerId]
}

export function getProviderLogoSrc(
  providerId: string,
  theme?: ProviderLogoTheme
): string | null {
  if (!isProviderLogoId(providerId)) return null

  const params = new URLSearchParams({
    provider: providerId
  })

  if (theme) {
    params.set('theme', theme)
  }

  return `/api/osint/image-proxy?${params.toString()}`
}
