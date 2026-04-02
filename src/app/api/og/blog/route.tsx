import {
  Avatar,
  Badge,
  ContentContainer,
  GradientAccent,
  GridPattern,
  Header,
  OGWrapper,
  createErrorResponse,
  createOGResponse,
  verifyOGRequest,
} from '@/lib/og-utils';
import { gradients, siteConfig } from '@/lib/og-config';

import { NextRequest } from 'next/server';

function BlogOG({
  title,
  description,
  tags,
  date,
  readingTime,
}: {
  title: string;
  description: string;
  tags: string[];
  date: string;
  readingTime: string;
}) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <OGWrapper gradient={gradients.blog}>
      <GridPattern />
      <GradientAccent color="rgba(251,146,60,0.25)" size={350} top={-80} right={-80} />
      <ContentContainer>
        {/* Header row */}
        <Header
          badge={
            <Badge
              icon="✍️"
              text="Blog"
              gradient="linear-gradient(135deg, rgba(251,146,60,0.3) 0%, rgba(234,88,12,0.3) 100%)"
            />
          }
          domain={siteConfig.blog.domain}
        />

        {/* Title + description + tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.15,
              margin: 0,
              maxWidth: '900px',
              overflow: 'hidden',
              maxHeight: '130px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 26,
              color: 'rgba(255,255,255,0.75)',
              margin: 0,
              maxWidth: '820px',
              lineHeight: 1.4,
              overflow: 'hidden',
              maxHeight: '74px',
            }}
          >
            {description}
          </p>
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {tags.slice(0, 5).map((tag) => (
                <div
                  key={tag}
                  style={{
                    background: 'rgba(251,146,60,0.15)',
                    border: '1px solid rgba(251,146,60,0.4)',
                    color: 'rgba(251,146,60,1)',
                    borderRadius: 999,
                    padding: '6px 16px',
                    fontSize: 20,
                    display: 'flex',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Reading time + date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 22,
            }}
          >
            {readingTime && <span>⏱ {readingTime} min read</span>}
            {readingTime && formattedDate && (
              <span style={{ display: 'flex' }}>·</span>
            )}
            {formattedDate && <span style={{ display: 'flex' }}>{formattedDate}</span>}
          </div>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Avatar size={48} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, display: 'flex' }}>
              Dipak Parmar
            </span>
          </div>
        </div>
      </ContentContainer>
    </OGWrapper>
  );
}

export async function GET(request: NextRequest) {
  const verification = await verifyOGRequest(request);
  if (!verification.valid) {
    return new Response(verification.error || 'Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const defaults = siteConfig.blog.defaults;

  const title = searchParams.get('title') || defaults.title;
  const description = searchParams.get('description') || defaults.description;
  const tagsParam = searchParams.get('tags') || '';
  const date = searchParams.get('date') || '';
  const readingTime = searchParams.get('readingTime') || '';

  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const allText = [
    title,
    description,
    ...tags,
    readingTime ? `${readingTime} min read` : '',
    date
      ? new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    'Blog',
    'Dipak Parmar',
    'dipak.tech',
  ]
    .filter(Boolean)
    .join('');

  const element = (
    <BlogOG
      title={title}
      description={description}
      tags={tags}
      date={date}
      readingTime={readingTime}
    />
  );

  try {
    return await createOGResponse(element, allText);
  } catch (e: unknown) {
    return createErrorResponse(e instanceof Error ? e.message : 'Unknown error');
  }
}
