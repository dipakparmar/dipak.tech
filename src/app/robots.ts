import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('host') || 'dipak.tech';

  // Determine the protocol (use https for production domains)
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/']
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
