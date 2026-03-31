'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { SearchToggle } from '@/components/blog/search-toggle';
import type { PostMeta } from '@/lib/blog';

interface BlogListProps {
  posts: PostMeta[];
  tags: { name: string; count: number }[];
}

export function BlogList({ posts }: BlogListProps) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? posts.filter((post) => {
        const q = query.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          post.description.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      })
    : posts;

  return (
    <main className="min-h-dvh">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Writings on software engineering, infrastructure, and DevSecOps.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          <SearchToggle onSearch={setQuery} />
          <Link
            href="/blog/tags"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View all tags"
          >
            <Tag className="size-4" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-border">
        {filtered.map((post) => (
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

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No posts found.
        </p>
      )}
    </main>
  );
}
