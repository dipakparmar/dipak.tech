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
        className="group inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/55 hover:text-foreground transition-colors duration-150 mb-8"
      >
        <ArrowLeft
          className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={1.5}
        />
        <span>Writing</span>
      </Link>

      <header className="mb-12">
        <h1 className="text-[28px] font-medium tracking-[-0.04em] leading-[1.1]">
          Tags
        </h1>
        <p className="text-sm text-muted-foreground mt-2 tracking-[-0.005em]">
          Browse writing grouped by topic.
        </p>
      </header>

      <ul className="flex flex-wrap gap-x-2 gap-y-2.5">
        {tags.map((tag) => (
          <li key={tag.name}>
            <Link
              href={`/blog/tags/${tag.name}`}
              className="group/tag inline-flex items-center gap-2 text-[13px] tracking-[-0.005em] text-muted-foreground border border-border/70 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/25 transition-colors duration-150"
            >
              <span>{tag.name}</span>
              <span className="text-[11px] text-muted-foreground/45 tabular-nums group-hover/tag:text-muted-foreground transition-colors duration-150">
                {tag.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-16 text-center">
          No tags yet — like an empty commit history. Give it time.
        </p>
      )}
    </main>
  );
}
