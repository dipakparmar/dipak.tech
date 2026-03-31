import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags } from '@/lib/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags | Blog | Dipak Parmar',
  description: 'Browse blog posts by tag.',
  alternates: {
    canonical: 'https://dipak.tech/blog/tags',
  },
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <main className="min-h-dvh">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="size-3" />
        Back to blog
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Tags</h1>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link
            key={tag.name}
            href={`/blog/tags/${tag.name}`}
            className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md hover:text-foreground transition-colors"
          >
            {tag.name}
            <span className="ml-1.5 text-muted-foreground/50">{tag.count}</span>
          </Link>
        ))}
      </div>

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-12 text-center">
          No tags yet — like an empty commit history. Give it time.
        </p>
      )}
    </main>
  );
}
