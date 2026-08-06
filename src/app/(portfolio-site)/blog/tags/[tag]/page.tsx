import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags, getPostsByTag } from '@/lib/blog';
import type { Metadata } from 'next';
import { PostRows } from '@/components/blog/post-rows';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.name }));
}

export async function generateMetadata({
  params
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged "${tag}" | Blog | Dipak Parmar`,
    description: `Blog posts about ${tag}.`,
    alternates: {
      canonical: `https://dipak.tech/blog/tags/${tag}`
    }
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);

  return (
    <main className="min-h-dvh">
      <Link
        href="/blog/tags"
        className="group inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/55 hover:text-foreground transition-colors duration-150 mb-8"
      >
        <ArrowLeft
          className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={1.5}
        />
        <span>All tags</span>
      </Link>

      <header className="mb-12">
        <h1 className="text-[28px] font-medium tracking-[-0.04em] leading-[1.1]">
          <span className="text-muted-foreground/35 font-normal">#</span>
          {tag}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 tracking-[-0.005em]">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged with{' '}
          <span className="text-foreground/80">{tag}</span>.
        </p>
      </header>

      <PostRows posts={posts} />

      {posts.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-16 text-center">
          Nothing tagged here yet — but every great repo starts with an empty
          folder.
        </p>
      )}
    </main>
  );
}
