'use client';

import Link from 'next/link';
import type { PostMeta } from '@/lib/blog';
import { SearchToggle } from '@/components/blog/search-toggle';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { PostRows } from '@/components/blog/post-rows';

interface BlogListProps {
  posts: PostMeta[];
  tags: { name: string; count: number }[];
}

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
  "The blog is empty but my terminal history isn't. That counts, right?",
  "I promise I'm more interesting than this empty page suggests.",
  'New posts loading... have you tried turning it off and on again?'
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function BlogList({ posts }: BlogListProps) {
  const [emptyBlogLine] = useState(() => pick(EMPTY_LINES));

  return (
    <main className="min-h-dvh">
      <header className="flex items-end justify-between gap-4 mb-12">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.04em] leading-[1.1]">
            Writing
          </h1>
          <p className="text-sm text-muted-foreground mt-2 tracking-[-0.005em]">
            Notes on software engineering, infrastructure, and DevSecOps.
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 -mb-1">
          <SearchToggle posts={posts} />
          <Link
            href="/blog/tags"
            className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors duration-150"
            aria-label="View all tags"
          >
            <Tag className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      <PostRows posts={posts} />

      {posts.length === 0 && (
        <div className="py-16 text-center">
          <p
            className="text-sm text-muted-foreground italic"
            suppressHydrationWarning
          >
            {emptyBlogLine}
          </p>
        </div>
      )}
    </main>
  );
}
