import { createHmac } from 'crypto';

// =============================================================================
// OG Image Configuration - Single Source of Truth
// =============================================================================

// Secret key for signing OG URLs
export const OG_SECRET = process.env.OG_SECRET || 'og-default-secret-change-in-production';

// Image dimensions
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// =============================================================================
// Site Configurations
// =============================================================================

export const siteConfig = {
  portfolio: {
    domain: 'dipak.tech',
    baseUrl: 'https://dipak.tech',
    ogPath: '/api/og',
    defaults: {
      title: 'Dipak Parmar',
      subtitle: 'DevSecOps Engineer & Open Source Developer',
      site: 'portfolio',
    },
  },
  tools: {
    domain: 'tools.dipak.io',
    baseUrl: 'https://tools.dipak.io',
    ogPath: '/api/og/tools',
    defaults: {
      tool: 'Developer Tools',
      description: 'Free online developer utilities',
      category: 'default',
    },
  },
  goPkg: {
    domain: 'go.pkg.dipak.io',
    baseUrl: 'https://go.pkg.dipak.io',
    ogPath: '/api/og/go-pkg',
    defaults: {
      package: 'Go Packages',
      description: 'Go module vanity imports',
    },
  },
  containerRegistry: {
    domain: 'cr.dipak.io',
    baseUrl: 'https://cr.dipak.io',
    ogPath: '/api/og/container-registry',
    defaults: {
      image: 'Container Registry',
      description: 'Docker images with vanity domain',
    },
  },
  links: {
    domain: 'dipak.bio',
    baseUrl: 'https://dipak.bio',
    ogPath: '/api/og/links',
    defaults: {
      name: 'Dipak Parmar',
      title: 'DevSecOps Engineer',
      handle: '@iamdipakparmar',
    },
  },
} as const;

export type SiteKey = keyof typeof siteConfig;

// Gradient themes for OG images
export const gradients = {
  portfolio: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  tools: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
  'go-pkg': 'linear-gradient(145deg, #00ADD8 0%, #007d9c 100%)',
  'container-registry': 'linear-gradient(145deg, #003f5c 0%, #2496ED 100%)',
  links: 'linear-gradient(145deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)',
} as const;

export type GradientKey = keyof typeof gradients;

// Tool category icons
export const toolIcons: Record<string, string> = {
  certificates: '🔐',
  osint: '🔍',
  'github-release-notes': '📋',
  whois: '🌐',
  default: '🛠️',
};

// Avatar URL
export const AVATAR_URL = 'https://avatars.githubusercontent.com/u/24366206?v=4';

// =============================================================================
// Token Generation (Server-side, synchronous)
// =============================================================================

export function generateOGTokenSync(params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const hmac = createHmac('sha256', OG_SECRET);
  hmac.update(sortedParams);
  return hmac.digest('hex');
}

// Build a signed OG URL (synchronous, for use in metadata)
export function buildOGUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string>
): string {
  const token = generateOGTokenSync(params);
  const searchParams = new URLSearchParams(params);
  searchParams.set('token', token);
  return `${baseUrl}${path}?${searchParams.toString()}`;
}

// =============================================================================
// Pre-built URL generators for each site
// =============================================================================

export const ogUrls = {
  portfolio: (params: { title?: string; subtitle?: string; site?: string } = {}) => {
    const config = siteConfig.portfolio;
    return buildOGUrl(config.baseUrl, config.ogPath, {
      title: params.title || config.defaults.title,
      subtitle: params.subtitle || config.defaults.subtitle,
      site: params.site || config.defaults.site,
    });
  },

  tools: (params: { tool?: string; description?: string; category?: string } = {}) => {
    const config = siteConfig.tools;
    return buildOGUrl(config.baseUrl, config.ogPath, {
      tool: params.tool || config.defaults.tool,
      description: params.description || config.defaults.description,
      category: params.category || config.defaults.category,
    });
  },

  goPkg: (params: { package?: string; description?: string; import?: string } = {}) => {
    const config = siteConfig.goPkg;
    return buildOGUrl(config.baseUrl, config.ogPath, {
      package: params.package || config.defaults.package,
      description: params.description || config.defaults.description,
      ...(params.import && { import: params.import }),
    });
  },

  containerRegistry: (params: { image?: string; description?: string; registry?: string } = {}) => {
    const config = siteConfig.containerRegistry;
    return buildOGUrl(config.baseUrl, config.ogPath, {
      image: params.image || config.defaults.image,
      description: params.description || config.defaults.description,
      ...(params.registry && { registry: params.registry }),
    });
  },

  links: (params: { name?: string; title?: string; handle?: string } = {}) => {
    const config = siteConfig.links;
    return buildOGUrl(config.baseUrl, config.ogPath, {
      name: params.name || config.defaults.name,
      title: params.title || config.defaults.title,
      handle: params.handle || config.defaults.handle,
    });
  },
};
