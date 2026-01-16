import { siteConfig } from './og-config';

// =============================================================================
// Host Configuration - Derived from siteConfig
// =============================================================================

export const hosts = {
  portfolio: siteConfig.portfolio.domain,
  tools: siteConfig.tools.domain,
  ip: siteConfig.ip.domain,
  goPkg: siteConfig.goPkg.domain,
  containerRegistry: siteConfig.containerRegistry.domain,
  links: siteConfig.links.domain,
} as const;

export type HostKey = keyof typeof hosts;

// Route prefixes when accessed from the main portfolio site
export const routePrefixes: Record<HostKey, string> = {
  portfolio: '',
  tools: '/tools',
  ip: '/tools/ip',
  goPkg: '/go-pkg',
  containerRegistry: '/container-registry',
  links: '/links',
};

// =============================================================================
// Host Detection
// =============================================================================

/**
 * Check if the current host matches a specific site
 */
export function isHost(hostKey: HostKey, host?: string | null): boolean {
  return Boolean(host && host.includes(hosts[hostKey]));
}

/**
 * Detect which site we're on based on the host
 */
export function detectHost(host?: string | null): HostKey | null {
  if (!host) return null;

  for (const [key, domain] of Object.entries(hosts)) {
    if (host.includes(domain)) {
      return key as HostKey;
    }
  }

  return null;
}

/**
 * Check if we're on the main portfolio site
 */
export function isMainSite(host?: string | null): boolean {
  // If on portfolio domain or no specific subdomain matched
  return isHost('portfolio', host) || detectHost(host) === null;
}

// =============================================================================
// Path Building
// =============================================================================

/**
 * Get the base path for a site based on current host
 * Returns empty string if on the site's own domain, otherwise returns the route prefix
 */
export function getBasePath(hostKey: HostKey, currentHost?: string | null): string {
  return isHost(hostKey, currentHost) ? '' : routePrefixes[hostKey];
}

/**
 * Build a href for a specific site
 * Handles path normalization and base path addition
 */
export function buildHref(
  hostKey: HostKey,
  path: string,
  currentHost?: string | null
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = getBasePath(hostKey, currentHost);

  // Avoid double slashes
  if (basePath && normalizedPath === '/') {
    return basePath;
  }

  return `${basePath}${normalizedPath}`;
}

/**
 * Normalize a pathname based on current host context
 * Useful for navigation and active state detection
 */
export function normalizePathname(
  hostKey: HostKey,
  pathname: string,
  currentHost?: string | null
): string {
  if (!pathname) return '/';

  const prefix = routePrefixes[hostKey];

  if (isHost(hostKey, currentHost)) {
    // On the site's own domain - strip the prefix if present
    if (pathname === prefix) return '/';
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.replace(new RegExp(`^${prefix}`), '');
    }
    return pathname;
  }

  // On main site - ensure prefix is present
  if (pathname === '/') return prefix || '/';
  if (pathname.startsWith(prefix)) return pathname;
  return `${prefix}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}

