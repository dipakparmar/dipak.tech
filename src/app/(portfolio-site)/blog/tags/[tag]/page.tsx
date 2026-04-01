import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags, getPostsByTag } from '@/lib/blog';
import { BlurFade } from '@/components/magicui/blur-fade';
import type { Metadata } from 'next';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.name }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged "${tag}" | Blog | Dipak Parmar`,
    description: `Blog posts about ${tag}.`,
    alternates: {
      canonical: `https://dipak.tech/blog/tags/${tag}`,
    },
  };
}

const BLUR_FADE_DELAY = 0.04;

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);

  return (
    <main className="min-h-dvh">
      <BlurFade delay={BLUR_FADE_DELAY}>
        <Link
          href="/blog/tags"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 group"
        >
          <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
          All tags
        </Link>
      </BlurFade>

      <BlurFade delay={BLUR_FADE_DELAY * 2}>
        <h1 className="text-3xl font-bold tracking-tighter mb-8">
          <span className="text-muted-foreground/50 font-normal">#</span>{tag}
        </h1>
      </BlurFade>

      <div>
        {posts.map((post, i) => (
          <BlurFade key={post.slug} delay={BLUR_FADE_DELAY * 3 + i * 0.05}>
            <Link
              href={`/blog/${post.slug}`}
              className="block py-5 group border-b border-border last:border-none -mx-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-medium group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <span className="text-xs text-muted-foreground/50 shrink-0 tabular-nums">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 text-pretty">
                {post.description}
              </p>
              <span className="text-xs text-muted-foreground/50 mt-2 inline-block">
                {post.readingTime} min read
              </span>
            </Link>
          </BlurFade>
        ))}
      </div>

      {posts.length === 0 && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <p className="text-sm text-muted-foreground italic py-16 text-center">
            Nothing tagged here yet — but every great repo starts with an empty folder.
          </p>
        </BlurFade>
      )}
    </main>
  );
}
