import {
  Badge,
  ContentContainer,
  Footer,
  GradientAccent,
  GridPattern,
  Header,
  OGWrapper,
  TitleSection,
  createErrorResponse,
  createOGResponse,
  gradients,
  siteConfig,
  toolIcons,
  verifyOGRequest,
} from '@/lib/og-utils';

import { NextRequest } from 'next/server';

function ToolsOG({
  tool,
  description,
  icon,
}: {
  tool: string;
  description: string;
  icon: string;
}) {
  return (
    <OGWrapper gradient={gradients.tools}>
      <GridPattern />
      <GradientAccent />
      <ContentContainer>
        <Header
          badge={
            <Badge
              icon="🛠️"
              text="Developer Tools"
              gradient="linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"
            />
          }
          domain={siteConfig.tools.domain}
        />
        <TitleSection icon={icon} title={tool} description={description} />
        <Footer />
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
  const defaults = siteConfig.tools.defaults;

  const tool = searchParams.get('tool') || defaults.tool;
  const description = searchParams.get('description') || defaults.description;
  const category = searchParams.get('category') || defaults.category;

  const icon = toolIcons[category] || toolIcons.default;
  const allText = `${tool}${description}Developer Toolstools.dipak.ioDipak Parmar`;

  const element = <ToolsOG tool={tool} description={description} icon={icon} />;

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
