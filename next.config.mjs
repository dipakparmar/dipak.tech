const ContentSecurityPolicy = `
	default-src 'self';
	script-src 'self' https://www.googletagmanager.com 'unsafe-inline' 'unsafe-eval';
	style-src 'self' 'unsafe-inline';
	child-src ;
	frame-src ;
	connect-src 'self' https://www.cloudflare.com/cdn-cgi/trace https://graph.dipak.io;
	img-src 'self' https://github.com https://avatars.githubusercontent.com data:;
	media-src 'self';
	font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
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

export default nextConfig;
