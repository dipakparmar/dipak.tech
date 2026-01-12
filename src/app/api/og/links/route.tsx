import {
  Avatar,
  OGWrapper,
  createErrorResponse,
  createOGResponse,
  gradients,
  siteConfig,
  verifyOGRequest,
} from '@/lib/og-utils';

import { NextRequest } from 'next/server';

// Decorative circles
function DecorativeCircles() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: 100,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }}
      />
    </>
  );
}

// Social icon component
function SocialIcon({ path }: { path: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '50%',
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d={path} />
      </svg>
    </div>
  );
}

// Social icon paths
const socialPaths = {
  github:
    'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
};

function LinksOG({
  name,
  title,
  handle,
}: {
  name: string;
  title: string;
  handle: string;
}) {
  return (
    <OGWrapper gradient={gradients.links}>
      <DecorativeCircles />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Avatar with ring */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            padding: '6px',
          }}
        >
          <Avatar size={168} />
        </div>

        {/* Name and title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginTop: '28px',
          }}
        >
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            {name}
          </h1>
          <p style={{ fontSize: 32, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{handle}</p>
        </div>

        {/* Social icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '24px' }}>
          <SocialIcon path={socialPaths.github} />
          <SocialIcon path={socialPaths.linkedin} />
          <SocialIcon path={socialPaths.x} />
        </div>

        {/* Domain badge */}
        <div
          style={{
            marginTop: '24px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '100px',
            padding: '12px 32px',
            display: 'flex',
          }}
        >
          <span style={{ color: 'white', fontSize: 22, fontWeight: 600 }}>{siteConfig.links.domain}</span>
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
  const defaults = siteConfig.links.defaults;

  const name = searchParams.get('name') || defaults.name;
  const title = searchParams.get('title') || defaults.title;
  const handle = searchParams.get('handle') || defaults.handle;

  const allText = `${name}${title}${handle}dipak.bioGitHubLinkedIn`;

  const element = <LinksOG name={name} title={title} handle={handle} />;

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
