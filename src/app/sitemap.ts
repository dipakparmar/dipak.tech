import type { MetadataRoute, Route } from 'next';
import { join, normalize, resolve } from 'path';

import { headers } from 'next/headers';
import { stat } from 'fs/promises';

/**
 * Configuration interface for individual route settings in the sitemap.
 *
 * @property priority - The priority of the URL relative to other URLs on the site (0.0 to 1.0)
 * @property changeFrequency - How frequently the page is likely to change
 * @property lastModified - Function to fetch the lastModified date at build time
 * @property isDynamic - Whether the route has dynamic content from an API
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
  /**
   * Function that returns the date when the page content was last modified.
   * - For static pages: Returns the file modification time from the file system
   * - For dynamic pages: Queries the data source (API/database) for latest update
   * Called at build time to generate accurate lastModified dates automatically.
   */
  lastModified: () => Promise<Date>;
  /** Indicates if the route has dynamic content from an API */
  isDynamic: boolean;
}

/**
 * Gets the last modified time of a static page by checking its source file.
 *
 * @param filePath - The relative path to the page file from the app directory
 * @returns A promise that resolves to the file's last modification date
 *
 * @remarks
 * This function checks the actual file system modification time of the page file.
 * This means the sitemap will automatically update when you edit the page content.
 * Falls back to current date if file cannot be accessed.
 *
 * @example
 * ```ts
 * const lastMod = await getStaticPageLastModified('(portfolio-site)/home/page.tsx');
 * ```
 */
async function getStaticPageLastModified(filePath: string): Promise<Date> {
  try {
    if (!filePath || typeof filePath !== 'string') {
      console.warn('[Sitemap] Invalid file path provided');
      return new Date();
    }

    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/\/\//g, '/');

    const appDir = resolve(process.cwd(), 'src', 'app');
    const fullPath = resolve(appDir, sanitizedPath);

    if (!fullPath.startsWith(appDir)) {
      console.warn('[Sitemap] Path traversal attempt detected');
      return new Date();
    }

    if (!fullPath.endsWith('.tsx') && !fullPath.endsWith('.ts')) {
      console.warn('[Sitemap] Invalid file type requested');
      return new Date();
    }

    const stats = await stat(fullPath);

    if (!stats.isFile()) {
      console.warn('[Sitemap] Not a regular file');
      return new Date();
    }

    return stats.mtime;
  } catch (error) {
    console.warn('[Sitemap] Could not read file stats');
    return new Date();
  }
}

/**
 * Fetches the last modified date for dynamic content from the GraphQL API.
 *
 * @returns A promise that resolves to the most recent update timestamp from the links data
 *
 * @remarks
 * This function queries the GraphQL endpoint to get the most recent update time
 * from the links or social_links tables. Falls back to current date if no data exists.
 *
 */
async function getLinksLastModified(): Promise<Date> {
  try {
    const endpoint =
      process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
      'http://localhost:8080/v1/graphql';

    try {
      const url = new URL(endpoint);
      if (
        process.env.NODE_ENV === 'production' &&
        url.protocol !== 'https:'
      ) {
        console.error(
          '[Sitemap] GraphQL endpoint must use HTTPS in production'
        );
        return new Date();
      }
    } catch (urlError) {
      console.error('[Sitemap] Invalid GraphQL endpoint URL format');
      return new Date();
    }

    const query = `
      query getLastModified {
        links(order_by: {updated_at: desc}, limit: 1) {
          updated_at
        }
        social_links(order_by: {updated_at: desc}, limit: 1) {
          updated_at
        }
      }
    `;

    const result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        operationName: 'getLastModified'
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'dipak.bio/sitemap/1.0.0'
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000)
    });

    if (!result.ok) {
      console.warn(
        `[Sitemap] GraphQL request failed with status ${result.status}`
      );
      return new Date();
    }

    const responseData = await result.json();

    if (!responseData || typeof responseData !== 'object') {
      console.warn('[Sitemap] Invalid response format from GraphQL');
      return new Date();
    }

    const { data } = responseData;

    const linksDate = data?.links?.[0]?.updated_at;
    const socialLinksDate = data?.social_links?.[0]?.updated_at;

    const dates = [linksDate, socialLinksDate]
      .filter(Boolean)
      .map((d) => {
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
      })
      .filter((d): d is Date => d !== null);

    if (dates.length === 0) {
      console.warn('[Sitemap] No valid timestamps found');
      return new Date();
    }

    return new Date(Math.max(...dates.map((d) => d.getTime())));
  } catch (error) {
    console.error('[Sitemap] Error fetching links last modified');
    return new Date();
  }
}

/**
 * Maps routes to their corresponding page file paths.
 *
 * @remarks
 * Used to automatically detect file modification times for static pages.
 * The path is relative to the src/app directory.
 */
const routeToFilePath: Readonly<Record<string, string>> = {
  '/': '(portfolio-site)/home/page.tsx',
  '/home': '(portfolio-site)/home/page.tsx',
  '/resume': '(portfolio-site)/resume/page.tsx',
  '/links': '(links-site)/links/page.tsx'
} as const;

/**
 * Configuration for specific routes with custom priority and change frequency.
 *
 * @remarks
 * Routes defined here will override the default configuration.
 * Priority values should be between 0.0 and 1.0, where:
 * - 1.0 = highest priority (e.g., homepage)
 * - 0.8 = high priority (e.g., main sections)
 * - 0.5 = medium priority (default)
 *
 * For dynamic routes (isDynamic: true):
 * - lastModified should be a function that fetches the latest update time from API/database
 * - The function will be called at build time to get the current data state
 *
 * For static routes (isDynamic: false):
 * - lastModified is automatically determined from the page file's modification time
 * - No manual updates needed - just edit your page and the sitemap updates automatically!
 */
const routeConfig: Partial<Record<Route, RouteConfig>> = {
  '/': {
    priority: 1,
    changeFrequency: 'monthly',
    lastModified: () => getStaticPageLastModified(routeToFilePath['/']),
    isDynamic: false
  },
  '/home': {
    priority: 1,
    changeFrequency: 'monthly',
    lastModified: () => getStaticPageLastModified(routeToFilePath['/home']),
    isDynamic: false
  },
  '/resume': {
    priority: 0.8,
    changeFrequency: 'monthly',
    lastModified: () => getStaticPageLastModified(routeToFilePath['/resume']),
    isDynamic: false
  },
  '/links': {
    priority: 1,
    changeFrequency: 'weekly',
    lastModified: getLinksLastModified,
    isDynamic: true
  }
};

/**
 * Default configuration for routes not explicitly specified in routeConfig.
 *
 * @remarks
 * Applied to any route that doesn't have a custom configuration.
 * Uses current date as fallback for lastModified.
 */
const defaultConfig: RouteConfig = {
  priority: 0.5,
  changeFrequency: 'monthly',
  lastModified: async () => new Date(),
  isDynamic: false
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
  if (!host || typeof host !== 'string') {
    console.warn('[Sitemap] Invalid host provided');
    return defaultDomainRoutes;
  }

  const sanitizedHost = host.toLowerCase().replace(/^https?:\/\//, '');

  for (const [domain, routes] of Object.entries(domainRoutes)) {
    if (sanitizedHost.includes(domain.toLowerCase())) {
      return routes;
    }
  }

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
 * 5. For dynamic routes, fetches the latest lastModified timestamp from the data source
 * 6. For static routes, uses the build-time lastModified date
 *
 * The sitemap automatically adjusts the protocol based on the environment:
 * - Uses 'http' for localhost
 * - Uses 'https' for all other domains
 *
 * Dynamic vs Static Routes:
 * - Dynamic routes (e.g., /links) query their data source for the latest update time
 * - Static routes (e.g., /home, /resume) use manually set dates from routeConfig
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
 * <url>
 *   <loc>https://dipak.bio/links</loc>
 *   <lastmod>2025-12-23T10:30:00.000Z</lastmod> <!-- Fetched dynamically -->
 *   <changefreq>weekly</changefreq>
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

  // Generate sitemap entries with proper lastModified handling
  const sitemapEntries: MetadataRoute.Sitemap = await Promise.all(
    routes.map(async (route) => {
      const config = routeConfig[route] || defaultConfig;

      // Fetch lastModified date - either from file system (static) or API (dynamic)
      const lastModified = await config.lastModified();

      return {
        url: `${baseUrl}${route}`,
        lastModified,
        changeFrequency: config.changeFrequency,
        priority: config.priority
      };
    })
  );

  return sitemapEntries;
}
