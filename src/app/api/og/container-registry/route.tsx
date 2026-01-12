import {
  Badge,
  ContentContainer,
  Footer,
  Header,
  OGWrapper,
  TitleSection,
  createErrorResponse,
  createOGResponse,
  gradients,
  siteConfig,
  verifyOGRequest,
} from '@/lib/og-utils';

import { NextRequest } from 'next/server';

// Container pattern overlay
function ContainerPattern() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.08,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='20' x='2' y='10' fill='white' rx='2'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

// Whale accent
function WhaleAccent() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 60,
        fontSize: 120,
        opacity: 0.2,
        display: 'flex',
      }}
    >
      🐋
    </div>
  );
}

function RegistryBadge({ registry }: { registry: string }) {
  if (!registry) return null;
  return (
    <div
      style={{
        background: registry === 'ghcr' ? 'rgba(36,41,46,0.8)' : 'rgba(36,153,237,0.3)',
        borderRadius: '8px',
        padding: '8px 16px',
        marginLeft: '12px',
        display: 'flex',
      }}
    >
      <span style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
        {registry === 'ghcr' ? 'GitHub Container Registry' : 'Docker Hub'}
      </span>
    </div>
  );
}

function ContainerRegistryOG({
  image,
  description,
  registry,
}: {
  image: string;
  description: string;
  registry: string;
}) {
  return (
    <OGWrapper gradient={gradients['container-registry']}>
      <ContainerPattern />
      <WhaleAccent />
      <ContentContainer>
        <Header
          badge={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Badge icon="📦" text="Container Registry" />
              <RegistryBadge registry={registry} />
            </div>
          }
          domain={siteConfig.containerRegistry.domain}
        />
        <TitleSection
          title={image}
          description={description}
          command={
            image !== 'Container Registry'
              ? { prefix: 'docker pull', value: `cr.dipak.io/${image}` }
              : undefined
          }
        />
        <Footer name="dipakparmar" />
      </ContentContainer>
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
  const defaults = siteConfig.containerRegistry.defaults;

  const image = searchParams.get('image') || defaults.image;
  const description = searchParams.get('description') || defaults.description;
  const registry = searchParams.get('registry') || '';

  const allText = `${image}${description}Container Registrycr.dipak.iodipakparmar`;

  const element = (
    <ContainerRegistryOG image={image} description={description} registry={registry} />
  );

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
