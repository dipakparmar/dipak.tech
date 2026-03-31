import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags, getPostsByTag } from '@/lib/blog';
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

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);

  return (
    <main className="min-h-dvh">
      <Link
        href="/blog/tags"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="size-3" />
        All tags
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>

      <div className="divide-y divide-border">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block py-4 group"
          >
            <h2 className="text-base font-medium group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {post.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground/70">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {post.readingTime} min read
              </span>
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-12 text-center">
          Nothing tagged here yet — but every great repo starts with an empty folder.
        </p>
      )}
    </main>
  );
}
