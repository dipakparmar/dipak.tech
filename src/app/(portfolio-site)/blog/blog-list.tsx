'use client';

import { BlurFade } from '@/components/magicui/blur-fade';
import Image from 'next/image';
import Link from 'next/link';
import type { PostMeta } from '@/lib/blog';
import { SearchToggle } from '@/components/blog/search-toggle';
import { Tag } from 'lucide-react';
import { useState } from 'react';

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

const BLUR_FADE_DELAY = 0.04;

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
      <BlurFade delay={BLUR_FADE_DELAY}>
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter">Blog</h1>
            <p className="text-sm text-muted-foreground mt-1.5 text-pretty">
              Writings on software engineering, infrastructure, and DevSecOps.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-2">
            <SearchToggle onSearch={setQuery} />
            <Link
              href="/blog/tags"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              aria-label="View all tags"
            >
              <Tag className="size-4" />
            </Link>
          </div>
        </div>
      </BlurFade>

      <div className="divide-y divide-border">
        {filtered.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex items-start gap-4 py-4 group"
          >
            {post.image && (
              <div className="shrink-0 w-20 self-stretch rounded-md overflow-hidden bg-muted">
                <Image
                  src={post.image}
                  alt={post.title}
                  width={80}
                  height={120}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h2 className="text-base font-medium break-words group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {post.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
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
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground italic" suppressHydrationWarning>
              {query
                ? emptySearchLine.replace('{{q}}', query)
                : emptyBlogLine}
            </p>
          </div>
        </BlurFade>
      )}
    </main>
  );
}
