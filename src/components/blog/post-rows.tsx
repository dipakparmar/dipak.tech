import Link from 'next/link';
import type { PostMeta } from '@/lib/blog';
import { NewStamp } from '@/components/blog/new-stamp';

const NEW_THRESHOLD_DAYS = 21;

function isNew(date: string): boolean {
  const diff = Date.now() - new Date(date).getTime();
  return diff / (1000 * 60 * 60 * 24) <= NEW_THRESHOLD_DAYS;
}

function formatRowDate(date: string) {
  const d = new Date(date);
  return {
    mon: d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' }),
    day: d.toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit' }),
    year: d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric' })
  };
}

export function PostRows({ posts }: { posts: PostMeta[] }) {
  return (
    <ol>
      {posts.map((post) => {
        const d = formatRowDate(post.date);
        const fresh = isNew(post.date);
        return (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug.replace(/[^a-zA-Z0-9/_-]/g, '')}`}
              className="group flex flex-col gap-y-1.5 sm:grid sm:grid-cols-[5.25rem_1fr] sm:gap-x-8 sm:items-baseline py-5 sm:py-6"
            >
              <time
                dateTime={post.date}
                className="text-[11px] uppercase tracking-[0.08em] tabular-nums text-muted-foreground/60 sm:pt-[3px] group-hover:text-muted-foreground transition-colors duration-150"
              >
                <span className="sm:hidden">
                  {d.mon} {d.day}, {d.year}
                </span>
                <span className="hidden sm:inline-flex flex-col leading-[1.35]">
                  <span>
                    {d.mon} {d.day}
                  </span>
                  <span className="text-muted-foreground/40">{d.year}</span>
                </span>
              </time>

              <div className="min-w-0">
                <h2 className="relative text-[17px] font-[470] tracking-[-0.015em] leading-[1.35] text-foreground/95 text-pretty break-words">
                  <span className="scribble-underline-text scribble-underline-text--draw">
                    {post.title}
                  </span>
                  {fresh && <NewStamp />}
                </h2>
                {post.description && (
                  <p className="text-[13.5px] text-muted-foreground/85 mt-1.5 leading-[1.55] tracking-[-0.005em] text-pretty">
                    {post.description}
                  </p>
                )}
                {(post.tags.length > 0 || post.readingTime) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground/55 tracking-[-0.005em]">
                    <span className="tabular-nums">{post.readingTime} min</span>
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
  );
}
