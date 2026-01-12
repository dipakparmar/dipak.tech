import { ImageResponse } from 'next/og';
import {
  OG_SECRET,
  OG_WIDTH,
  OG_HEIGHT,
  AVATAR_URL,
  LOGO_URL,
  gradients,
  toolIcons,
  siteConfig,
} from './og-config';

// Re-export config for convenience
export {
  OG_WIDTH,
  OG_HEIGHT,
  AVATAR_URL,
  LOGO_URL,
  gradients,
  toolIcons,
  siteConfig,
};

export type SiteType = keyof typeof gradients;

// Derive domains from siteConfig
export const domains: Record<SiteType, string> = {
  portfolio: siteConfig.portfolio.domain,
  tools: siteConfig.tools.domain,
  'go-pkg': siteConfig.goPkg.domain,
  'container-registry': siteConfig.containerRegistry.domain,
  links: siteConfig.links.domain,
};

// =============================================================================
// OG URL Verification (Edge runtime compatible - uses Web Crypto API)
// =============================================================================

// Convert ArrayBuffer to hex string
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate HMAC signature for OG parameters (async for Edge runtime)
export async function generateOGToken(params: Record<string, string>): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OG_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sortedParams));
  return toHex(signature);
}

// Verify HMAC signature for OG parameters
export async function verifyOGToken(
  params: Record<string, string>,
  token: string
): Promise<boolean> {
  const expectedToken = await generateOGToken(params);
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

// Extract params from URL (excluding token) for verification
export function extractOGParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'token') {
      params[key] = value;
    }
  });
  return params;
}

// Middleware to verify OG request
export async function verifyOGRequest(request: Request): Promise<{ valid: boolean; error?: string }> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Allow requests without token in development
  if (process.env.NODE_ENV === 'development' && !token) {
    return { valid: true };
  }

  if (!token) {
    return { valid: false, error: 'Missing token' };
  }

  const params = extractOGParams(searchParams);
  const isValid = await verifyOGToken(params, token);

  if (!isValid) {
    return { valid: false, error: 'Invalid token' };
  }

  return { valid: true };
}

// =============================================================================
// Font Loading
// =============================================================================

export async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@400;600;700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error('Failed to load font data');
}

// =============================================================================
// Shared OG Image Components
// =============================================================================

// Shared avatar component (returns JSX for OG images)
export function Avatar({ size = 80 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AVATAR_URL}
      alt=""
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: `${Math.max(2, size / 20)}px solid rgba(255,255,255,0.3)`,
      }}
    />
  );
}

// Common footer with avatar
export function Footer({ name = 'Dipak Parmar' }: { name?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      <Avatar size={48} />
      <span
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 22,
        }}
      >
        by {name}
      </span>
    </div>
  );
}

// Grid pattern overlay
export function GridPattern({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,${opacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,${opacity}) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }}
    />
  );
}

// Gradient accent circle
export function GradientAccent({
  color = 'rgba(14,165,233,0.3)',
  size = 400,
  top = -100,
  right = -100,
}: {
  color?: string;
  size?: number;
  top?: number;
  right?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}

// Base wrapper for OG images
interface OGWrapperProps {
  children: React.ReactNode;
  gradient: string;
  showGrid?: boolean;
}

export function OGWrapper({ children, gradient, showGrid = false }: OGWrapperProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: gradient,
        fontFamily: 'Inter',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {showGrid && <GridPattern />}
      {children}
    </div>
  );
}

// Content container with padding and z-index
export function ContentContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '60px 80px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {children}
    </div>
  );
}

// Header with badge and domain
interface HeaderProps {
  badge: React.ReactNode;
  domain: string;
}

export function Header({ badge, domain }: HeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {badge}
      <span
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 20,
        }}
      >
        {domain}
      </span>
    </div>
  );
}

// Main title section
interface TitleSectionProps {
  icon?: string;
  title: string;
  description: string;
  command?: { prefix: string; value: string };
}

export function TitleSection({ icon, title, description, command }: TitleSectionProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {icon && (
        <div style={{ fontSize: 80, display: 'flex' }}>
          {icon}
        </div>
      )}
      <h1
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: 'white',
          lineHeight: 1.1,
          margin: 0,
          textShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.8)',
          margin: 0,
          maxWidth: '800px',
        }}
      >
        {description}
      </p>
      {command && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px 20px',
              fontFamily: 'monospace',
              display: 'flex',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>
              {command.prefix}{' '}
            </span>
            <span style={{ color: 'white', fontSize: 22, fontWeight: 600 }}>
              {command.value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Badge component
interface BadgeProps {
  icon?: string;
  text: string;
  subtext?: string;
  gradient?: string;
}

export function Badge({ icon, text, subtext, gradient }: BadgeProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          background: gradient || 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
        <span
          style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          {text}
        </span>
        {subtext && (
          <span
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 20,
            }}
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Response Helpers
// =============================================================================

// Create ImageResponse with common settings
export async function createOGResponse(
  element: React.ReactElement,
  textForFont: string
): Promise<ImageResponse> {
  return new ImageResponse(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    emoji: 'twemoji',
    fonts: [
      {
        name: 'Inter',
        data: await loadGoogleFont('Inter', textForFont),
        style: 'normal',
      },
    ],
  });
}

// Error response helper
export function createErrorResponse(message: string): Response {
  console.log(`OG Image generation failed: ${message}`);
  return new Response('Failed to generate the image', { status: 500 });
}
