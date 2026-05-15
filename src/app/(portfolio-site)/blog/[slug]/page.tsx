import type { BlogPosting, WithContext } from 'schema-dts';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { JsonLd } from '@/components/seo/json-ld';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Toc } from '@/components/blog/toc';
import { ReadingProgress } from '@/components/blog/reading-progress';
import { mdxComponents } from '@/components/mdx-components';
import { notFound } from 'next/navigation';
import { personReference } from '@/lib/schema';
import { headers } from 'next/headers';
import { ogUrls } from '@/lib/og-config';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { meta } = await getPostBySlug(slug);
    const headersList = await headers();
    const host = headersList.get('host') ?? 'dipak.tech';
    const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    const currentBaseUrl = `${proto}://${host}`;
    return {
      title: `${meta.title} | Dipak Parmar`,
      description: meta.description,
      alternates: {
        canonical: `https://dipak.tech/blog/${slug}`,
      },
      openGraph: {
        title: meta.title,
        description: meta.description,
        type: 'article',
        publishedTime: meta.date,
        modifiedTime: meta.updated,
        tags: meta.tags,
        images: [
          ogUrls.blog({
            title: meta.title,
            description: meta.description,
            tags: meta.tags.join(','),
            date: meta.date,
            readingTime: String(meta.readingTime),
            baseUrl: currentBaseUrl,
          }),
        ],
      },
    };
  } catch {
    return {};
  }
}

const BLUR_FADE_DELAY = 0.04;

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  const { meta, content: Content, toc } = post;

  const postSchema: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `https://dipak.tech/blog/${slug}#post`,
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    ...(meta.updated && { dateModified: meta.updated }),
    author: personReference,
    url: `https://dipak.tech/blog/${slug}`,
    keywords: meta.tags,
    ...(meta.image && { image: meta.image }),
  };

  return (
    <>
      <JsonLd data={postSchema} />
      <ReadingProgress />
      <Toc entries={toc} />
      <article>
        <header className="mb-12">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/55 hover:text-foreground transition-colors duration-150 mb-8"
          >
            <ArrowLeft className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={1.5} />
            <span>Writing</span>
          </Link>
          <h1 className="text-[28px] sm:text-[34px] md:text-[40px] font-medium tracking-[-0.035em] md:tracking-[-0.04em] leading-[1.1] text-foreground mb-5 text-balance break-words hyphens-auto">
            {meta.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/55 tabular-nums">
            <time dateTime={meta.date}>
              {new Date(meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              })}
            </time>
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <span>{meta.readingTime} min read</span>
            {meta.updated && (
              <>
                <span aria-hidden className="text-muted-foreground/30">·</span>
                <span>
                  Updated{' '}
                  {new Date(meta.updated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })}
                </span>
              </>
            )}
          </div>
          {meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {meta.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tags/${tag}`}
                  className="inline-flex items-center text-[11px] text-muted-foreground/75 border border-border/70 px-2.5 py-[3px] rounded-full hover:text-foreground hover:border-foreground/25 transition-colors duration-150"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {meta.image && (
          <div className="mb-8">
            <Image
              src={meta.image}
              alt={meta.title}
              width={768}
              height={400}
              className="w-full rounded-lg object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="blog-prose max-w-none">
          <Content components={mdxComponents} />
        </div>
      </article>
    </>
  );
}
