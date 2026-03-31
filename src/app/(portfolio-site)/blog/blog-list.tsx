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

const SEARCH_LINES = [
  'Nothing matching "{{q}}" — but I like your curiosity.',
  '"{{q}}"? Now you\'ve got me thinking...',
  'No results for "{{q}}" — yet. You might be ahead of me.',
  'Searched high and low for "{{q}}". Maybe buy me a coffee and ask again?',
  '"{{q}}" walked into a blog and found... nothing. Awkward.',
  'If "{{q}}" were a blog post, I\'d totally write it. Noted.',
  '"{{q}}"? That\'s actually a great idea for a post.',
  '404: "{{q}}" not found. But you are. Hi.',
  'I\'ve looked everywhere for "{{q}}". Even under the couch cushions.',
  '"{{q}}" is playing hard to get. Just like my deploy on Fridays.',
  'No "{{q}}" here — but stick around, I\'m full of surprises.',
  'Roses are red, violets are blue, "{{q}}" has no results, but I appreciate you.',
];

const EMPTY_LINES = [
  '"The best time to write was yesterday. The second best time is now." — I\'m on it.',
  'Plot twist: the blog posts were the friends we made along the way.',
  'This page is like my coffee — brewing. Check back soon.',
  'Nothing here yet, but great things take time... or so I tell myself.',
  'Coming soon: words, code, and questionable opinions.',
  'My thoughts are in staging. Waiting for approval to merge into production.',
  'sudo write --blog-posts... permission denied. Still working on it.',
  'git commit -m "add blog posts" — coming to a branch near you.',
  'Currently compiling thoughts. Estimated build time: soon™.',
  'The blog is empty but my terminal history isn\'t. That counts, right?',
  'I promise I\'m more interesting than this empty page suggests.',
  'New posts loading... have you tried turning it off and on again?',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function BlogList({ posts }: BlogListProps) {
  const [query, setQuery] = useState('');
  const [emptySearchLine] = useState(() => pick(SEARCH_LINES));
  const [emptyBlogLine] = useState(() => pick(EMPTY_LINES));

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
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground italic" suppressHydrationWarning>
            {query
              ? emptySearchLine.replace('{{q}}', query)
              : emptyBlogLine}
          </p>
        </div>
      )}
    </main>
  );
}
