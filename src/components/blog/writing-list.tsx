import Link from 'next/link';
import type { PostMeta } from '@/lib/blog';
import { NewStamp } from '@/components/blog/new-stamp';

interface WritingListProps {
  posts: PostMeta[];
  label?: string;
  newThresholdDays?: number;
  className?: string;
}

function formatDayMonth(date: string): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function groupByYear(posts: PostMeta[]) {
  const map = new Map<string, PostMeta[]>();
  for (const post of posts) {
    const year = String(new Date(post.date).getFullYear());
    const bucket = map.get(year);
    if (bucket) bucket.push(post);
    else map.set(year, [post]);
  }
  return Array.from(map.entries()).map(([year, items]) => ({ year, items }));
}

export function WritingList({
  posts,
  label = 'Writing',
  newThresholdDays = 21,
  className,
}: WritingListProps) {
  if (posts.length === 0) return null;
  const groups = groupByYear(posts);
  const now = Date.now();
  const threshold = newThresholdDays * 24 * 60 * 60 * 1000;

  return (
    <section className={className}>
      {label && (
        <h2 className="text-[13.5px] text-muted-foreground/65 tracking-[-0.005em] mb-3">
          {label}
        </h2>
      )}
      <div className="border-t border-border/70">
        {groups.map((group) => (
          <div
            key={group.year}
            className="grid grid-cols-[3rem_1fr] sm:grid-cols-[3.5rem_1fr] gap-x-4 sm:gap-x-6 items-start py-2 border-b border-border/70 last:border-b-0"
          >
            <div className="text-[13px] text-muted-foreground/55 tabular-nums pt-[7px]">
              {group.year}
            </div>
            <ol className="min-w-0">
              {group.items.map((post) => {
                const fresh = now - new Date(post.date).getTime() <= threshold;
                return (
                  <li key={post.slug} className="min-w-0">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-baseline gap-2 py-[5px] -mx-1 px-1 rounded-[2px] min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3E9FFF]/40"
                    >
                      <span className="relative flex-1 min-w-0 text-[14px] text-foreground/95 tracking-[-0.005em] leading-[1.45] text-pretty break-words">
                        {fresh && <NewStamp />}
                        <span className="scribble-underline-text scribble-underline-text--draw">
                          {post.title}
                        </span>
                      </span>
                      <time
                        dateTime={post.date}
                        className="text-[13px] text-muted-foreground/55 tabular-nums shrink-0 group-hover:text-muted-foreground transition-colors duration-150"
                      >
                        {formatDayMonth(post.date)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
