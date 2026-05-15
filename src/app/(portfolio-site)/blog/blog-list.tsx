'use client';

import Link from 'next/link';
import type { PostMeta } from '@/lib/blog';
import { SearchToggle } from '@/components/blog/search-toggle';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { NewStamp } from '@/components/blog/new-stamp';

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
  'The blog is empty but my terminal history isn\'t. That counts, right?',
  'I promise I\'m more interesting than this empty page suggests.',
  'New posts loading... have you tried turning it off and on again?',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NEW_THRESHOLD_DAYS = 21;

function isNew(date: string): boolean {
  const diff = Date.now() - new Date(date).getTime();
  return diff / (1000 * 60 * 60 * 24) <= NEW_THRESHOLD_DAYS;
}

function formatRowDate(date: string) {
  const d = new Date(date);
  return {
    mon: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.toLocaleDateString('en-US', { day: '2-digit' }),
    year: d.toLocaleDateString('en-US', { year: 'numeric' }),
  };
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

      <ol className="border-t border-border/70">
        {posts.map((post) => {
          const d = formatRowDate(post.date);
          const fresh = isNew(post.date);
          return (
            <li key={post.slug} className="border-b border-border/70">
              <Link
                href={`/blog/${post.slug}`}
                className="group grid grid-cols-[5.25rem_1fr] gap-x-5 sm:gap-x-8 items-baseline py-5 sm:py-6"
              >
                <time
                  dateTime={post.date}
                  className="text-[11px] uppercase tracking-[0.08em] tabular-nums text-muted-foreground/60 pt-[3px] group-hover:text-muted-foreground transition-colors duration-150"
                >
                  <span className="sm:hidden">
                    {d.mon} {d.day}, {d.year}
                  </span>
                  <span className="hidden sm:inline-flex flex-col leading-[1.35]">
                    <span>{d.mon} {d.day}</span>
                    <span className="text-muted-foreground/40">{d.year}</span>
                  </span>
                </time>

                <div className="min-w-0">
                  <h2 className="relative text-[17px] font-[470] tracking-[-0.015em] leading-[1.35] text-foreground/95 text-pretty break-words">
                    {fresh && <NewStamp />}
                    <span className="scribble-underline-text scribble-underline-text--draw">
                      {post.title}
                    </span>
                  </h2>
                  {post.description && (
                    <p className="text-[13.5px] text-muted-foreground/85 mt-1.5 leading-[1.55] tracking-[-0.005em]">
                      {post.description}
                    </p>
                  )}
                  {(post.tags.length > 0 || post.readingTime) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground/55 tracking-[-0.005em]">
                      <span className="tabular-nums">
                        {post.readingTime} min
                      </span>
                      {post.tags.length > 0 && (
                        <>
                          <span aria-hidden className="text-muted-foreground/30">
                            ·
                          </span>
                          <span className="inline-flex flex-wrap gap-x-2">
                            {post.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

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
