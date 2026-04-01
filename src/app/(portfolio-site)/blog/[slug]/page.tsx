import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, RefreshCw } from 'lucide-react';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { mdxComponents } from '@/components/mdx-components';
import { Toc } from '@/components/blog/toc';
import { JsonLd } from '@/components/seo/json-ld';
import { personReference } from '@/lib/schema';
import { BlurFade } from '@/components/magicui/blur-fade';
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
      <article className="min-h-dvh">
        <BlurFade delay={BLUR_FADE_DELAY}>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 group"
          >
            <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
            Back to blog
          </Link>
        </BlurFade>

        <header className="mb-10">
          <BlurFade delay={BLUR_FADE_DELAY * 2}>
            <div className="flex gap-2 mb-4">
              {meta.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tags/${tag}`}
                  className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/70 hover:text-primary transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl leading-tight">
              {meta.title}
            </h1>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <p className="text-muted-foreground mt-3 text-pretty">
              {meta.description}
            </p>
          </BlurFade>

          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <div className="flex items-center gap-4 mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Calendar className="size-3" />
                <time dateTime={meta.date}>
                  {new Date(meta.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
              {meta.updated && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <RefreshCw className="size-3" />
                  <span>
                    {new Date(meta.updated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Clock className="size-3" />
                <span>{meta.readingTime} min read</span>
              </div>
            </div>
          </BlurFade>
        </header>

        <BlurFade delay={BLUR_FADE_DELAY * 6}>
          <div className="blog-prose max-w-none">
            <Content components={mdxComponents} />
          </div>
        </BlurFade>
      </article>
    </>
  );
}
