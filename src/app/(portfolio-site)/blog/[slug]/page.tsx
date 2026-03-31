import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { mdxComponents } from '@/components/mdx-components';
import { Toc } from '@/components/blog/toc';
import { JsonLd } from '@/components/seo/json-ld';
import { personReference } from '@/lib/schema';
import type { Metadata } from 'next';
import type { WithContext, BlogPosting } from 'schema-dts';

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
        ...(meta.image && { images: [meta.image] }),
      },
    };
  } catch {
    return {};
  }
}

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
      <Toc entries={toc} />
      <article className="min-h-dvh">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-3" />
          Back to blog
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
            <time dateTime={meta.date}>
              {new Date(meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {meta.updated && (
              <span>
                Updated{' '}
                {new Date(meta.updated).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            <span>{meta.readingTime} min read</span>
          </div>
          <div className="flex gap-2 mt-3">
            {meta.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/tags/${tag}`}
                className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md hover:text-foreground transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </header>

        <div className="blog-prose max-w-none">
          <Content components={mdxComponents} />
        </div>
      </article>
    </>
  );
}
