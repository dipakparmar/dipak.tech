import { withSentryConfig } from '@sentry/nextjs';
// Note: 'unsafe-inline' is required for script-src because Next.js injects
// many inline scripts for hydration/routing that cannot be hashed.
// This is a known Next.js limitation for static pages.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com;
  style-src 'self' 'unsafe-inline';
  child-src 'none';
  frame-src 'none';
  worker-src 'self' blob:;
  connect-src 'self' https://www.cloudflare.com https://cloudflareinsights.com https://www.google-analytics.com https://analytics.google.com https://*.doubleclick.net https://graph.dipak.io https://api.github.com https://ghcr.io https://registry-1.docker.io https://auth.docker.io https://hub.docker.com https://ct.certkit.io https://*.sentry.io;
  img-src 'self' https://github.com https://avatars.githubusercontent.com https://www.google-analytics.com https://*.google.com https://*.google.ca data:;
  media-src 'self';
  font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=()'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      }
    ]
  },

  async rewrites() {
    return [
      // go.pkg.dipak.io routes
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'go.pkg.dipak.io'
          }
        ],
        destination: '/go-pkg'
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'go.pkg.dipak.io'
          }
        ],
        destination: '/go-pkg/:path*'
      },
      // cr.dipak.io routes - Container Registry
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'cr.dipak.io'
          }
        ],
        destination: '/container-registry'
      },
      {
        source: '/v2',
        has: [
          {
            type: 'host',
            value: 'cr.dipak.io'
          }
        ],
        destination: '/container-registry/v2'
      },
      {
        source: '/v2/:path*',
        has: [
          {
            type: 'host',
            value: 'cr.dipak.io'
          }
        ],
        destination: '/container-registry/v2/:path*'
      },
      // tools.dipak.io routes
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'tools.dipak.io'
          }
        ],
        destination: '/tools'
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'tools.dipak.io'
          }
        ],
        destination: '/tools/:path*'
      },
      // dipak.bio routes
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'dipak.bio'
          }
        ],
        destination: '/links'
      },
      // Default route
      {
        source: '/',
        destination: '/home'
      }
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'dipakparmar',

  project: 'dipaktech',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true
    }
  }
});
