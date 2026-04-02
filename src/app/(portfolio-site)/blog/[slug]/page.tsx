import type { BlogPosting, WithContext } from 'schema-dts';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { JsonLd } from '@/components/seo/json-ld';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Toc } from '@/components/blog/toc';
import { mdxComponents } from '@/components/mdx-components';
import { notFound } from 'next/navigation';
import { personReference } from '@/lib/schema';

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
      <Toc entries={toc} />
      <article>
        <header className="mb-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3" />
            <span>back to blog list</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{meta.title}</h1>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground/60">
            <time dateTime={meta.date}>
              {new Date(meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{meta.readingTime} min read</span>
            {meta.updated && (
              <>
                <span>·</span>
                <span>
                  Updated{' '}
                  {new Date(meta.updated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
          {meta.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3">
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
