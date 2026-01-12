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

// Go pattern overlay
function GoPattern() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
  );
}

// Gopher accent
function GopherAccent() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: -50,
        right: 40,
        width: 300,
        height: 300,
        opacity: 0.15,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 280,
      }}
    >
      🐹
    </div>
  );
}

function GoPkgOG({
  pkg,
  description,
  importPath,
}: {
  pkg: string;
  description: string;
  importPath: string;
}) {
  return (
    <OGWrapper gradient={gradients['go-pkg']}>
      <GoPattern />
      <GopherAccent />
      <ContentContainer>
        <Header badge={<Badge icon="📦" text="Go" subtext="Packages" />} domain={siteConfig.goPkg.domain} />
        <TitleSection
          title={pkg}
          description={description}
          command={importPath ? { prefix: 'go get', value: importPath } : undefined}
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
  const defaults = siteConfig.goPkg.defaults;

  const pkg = searchParams.get('package') || defaults.package;
  const description = searchParams.get('description') || defaults.description;
  const importPath = searchParams.get('import') || '';

  const allText = `${pkg}${description}${importPath}Go Packagesgo.pkg.dipak.iodipakparmar`;

  const element = <GoPkgOG pkg={pkg} description={description} importPath={importPath} />;

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
