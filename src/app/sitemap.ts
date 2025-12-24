import type { MetadataRoute, Route } from 'next';

import { headers } from 'next/headers';

/**
 * Configuration interface for individual route settings in the sitemap.
 *
 * @property priority - The priority of the URL relative to other URLs on the site (0.0 to 1.0)
 * @property changeFrequency - How frequently the page is likely to change
 */
interface RouteConfig {
  /** Priority value between 0.0 and 1.0, where 1.0 is highest priority */
  priority: number;
  /** Expected change frequency of the page content */
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
}

/**
 * Configuration for specific routes with custom priority and change frequency.
 *
 * @remarks
 * Routes defined here will override the default configuration.
 * Priority values should be between 0.0 and 1.0, where:
 * - 1.0 = highest priority (e.g., homepage)
 * - 0.8 = high priority (e.g., main sections)
 * - 0.5 = medium priority (default)
 */
const routeConfig: Partial<Record<Route, RouteConfig>> = {
  '/': { priority: 1, changeFrequency: 'monthly' },
  '/home': { priority: 1, changeFrequency: 'monthly' },
  '/resume': { priority: 0.8, changeFrequency: 'monthly' },
  '/links': { priority: 1, changeFrequency: 'weekly' }
};

/**
 * Default configuration for routes not explicitly specified in routeConfig.
 *
 * @remarks
 * Applied to any route that doesn't have a custom configuration.
 */
const defaultConfig: RouteConfig = {
  priority: 0.5,
  changeFrequency: 'monthly'
};

/**
 * Routes to exclude from the sitemap generation.
 *
 * @remarks
 * Useful for excluding admin pages, drafts, authentication pages,
 * or any other routes that shouldn't be indexed by search engines.
 *
 * @example
 * ```ts
 * const excludedRoutes: Route[] = ['/admin', '/draft', '/api/webhook'];
 * ```
 */
const excludedRoutes: Route[] = ['/home', '/resume', '/links'];

/**
 * Domain-specific route configuration mapping.
 *
 * @remarks
 * Maps specific domains to their allowed routes. This enables different
 * sitemaps for different domains hosting the same application.
 * Domains are matched using partial string matching (includes).
 *
 * @example
 * When visiting 'dipak.bio', only '/' and '/links' routes will be included in the sitemap.
 */
const domainRoutes: Record<string, Route[]> = {
  'dipak.bio': ['/', '/links']
};

/**
 * Default routes for domains not explicitly configured in domainRoutes.
 *
 * @remarks
 * These routes will be used for any domain that doesn't have a specific
 * configuration (e.g., dipak.tech, dipak.io, dipak.to, dipakparmar.tech).
 */
const defaultDomainRoutes: Route[] = ['/', '/home', '/resume'];

/**
 * Determines which routes should be included in the sitemap for a given hostname.
 *
 * @param host - The hostname from the request headers (e.g., 'dipak.bio', 'dipak.tech')
 * @returns An array of routes that should be included in the sitemap for this domain
 *
 * @remarks
 * The function uses partial string matching, so 'dipak.bio' will match even if
 * the full host is 'www.dipak.bio' or 'https://dipak.bio'.
 *
 * @example
 * ```ts
 * const routes = getAllowedRoutesForDomain('dipak.bio');
 * // Returns: ['/', '/links']
 *
 * const defaultRoutes = getAllowedRoutesForDomain('dipak.tech');
 * // Returns: ['/', '/home', '/resume']
 * ```
 */
function getAllowedRoutesForDomain(host: string): Route[] {
  // Check if there's a specific configuration for this domain
  for (const [domain, routes] of Object.entries(domainRoutes)) {
    if (host.includes(domain)) {
      return routes;
    }
  }

  // Return default routes if no specific configuration found
  return defaultDomainRoutes;
}

/**
 * Generates a dynamic sitemap based on the requesting domain.
 *
 * @returns A promise that resolves to a Next.js sitemap object containing URL entries
 *
 * @remarks
 * This function:
 * 1. Detects the current hostname from request headers
 * 2. Determines appropriate routes for that domain
 * 3. Filters out excluded routes
 * 4. Generates sitemap entries with proper URLs, priorities, and change frequencies
 *
 * The sitemap automatically adjusts the protocol based on the environment:
 * - Uses 'http' for localhost
 * - Uses 'https' for all other domains
 *
 * @example
 * When accessed from dipak.bio:
 * ```xml
 * <url>
 *   <loc>https://dipak.bio/</loc>
 *   <lastmod>2025-12-23</lastmod>
 *   <changefreq>monthly</changefreq>
 *   <priority>1.0</priority>
 * </url>
 * ```
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap | Next.js Sitemap Documentation}
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get('host') || 'dipak.tech';

  // Determine the protocol (use https for production domains)
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Get allowed routes for current domain
  let routes = getAllowedRoutesForDomain(host);

  // Remove excluded routes
  routes = routes.filter((route) => !excludedRoutes.includes(route));

  // Generate sitemap entries
  const sitemapEntries: MetadataRoute.Sitemap = routes.map((route) => {
    const config = routeConfig[route] || defaultConfig;

    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: config.changeFrequency,
      priority: config.priority
    };
  });

  return sitemapEntries;
}
