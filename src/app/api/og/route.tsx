import {
  Avatar,
  OGWrapper,
  SiteType,
  createErrorResponse,
  createOGResponse,
  domains,
  gradients,
  siteConfig,
  verifyOGRequest,
} from '@/lib/og-utils';

import { NextRequest } from 'next/server';

function PortfolioOG({
  title,
  subtitle,
  icon,
  domain,
  gradient,
}: {
  title: string;
  subtitle: string;
  icon: string;
  domain: string;
  gradient: string;
}) {
  return (
    <OGWrapper gradient={gradient}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          padding: '60px 80px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Avatar size={80} />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 28, fontWeight: 600 }}>
              Dipak Parmar
            </span>
          </div>
          {icon && <div style={{ fontSize: 60, display: 'flex' }}>{icon}</div>}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.1,
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 32, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>
            {subtitle}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 24 }}>{domain}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}
            />
            <div
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }}
            />
            <div
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }}
            />
          </div>
        </div>
      </div>
    </OGWrapper>
  );
}

export async function GET(request: NextRequest) {
  // Verify token to prevent misuse
  const verification = await verifyOGRequest(request);
  if (!verification.valid) {
    return new Response(verification.error || 'Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const defaults = siteConfig.portfolio.defaults;

  const title = searchParams.get('title') || defaults.title;
  const subtitle = searchParams.get('subtitle') || defaults.subtitle;
  const site = (searchParams.get('site') as SiteType) || 'portfolio';
  const icon = searchParams.get('icon') || '';

  const gradient = gradients[site] || gradients.portfolio;
  const domain = domains[site] || domains.portfolio;
  const allText = `${title}${subtitle}Dipak Parmar${domain}`;

  const element = (
    <PortfolioOG title={title} subtitle={subtitle} icon={icon} domain={domain} gradient={gradient} />
  );

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
