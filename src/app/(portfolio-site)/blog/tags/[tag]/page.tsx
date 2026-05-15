import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags, getPostsByTag } from '@/lib/blog';
import type { Metadata } from 'next';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.name }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged "${tag}" | Blog | Dipak Parmar`,
    description: `Blog posts about ${tag}.`,
    alternates: {
      canonical: `https://dipak.tech/blog/tags/${tag}`,
    },
  };
}

function formatRowDate(date: string) {
  const d = new Date(date);
  return {
    mon: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.toLocaleDateString('en-US', { day: '2-digit' }),
    year: d.toLocaleDateString('en-US', { year: 'numeric' }),
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

      <ol className="border-t border-border/70">
        {posts.map((post) => {
          const d = formatRowDate(post.date);
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
                    <span>
                      {d.mon} {d.day}
                    </span>
                    <span className="text-muted-foreground/40">{d.year}</span>
                  </span>
                </time>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-[470] tracking-[-0.015em] leading-[1.35] text-foreground/95">
                    <span
                      className="bg-no-repeat bg-[length:0%_1px] bg-[position:0_92%] group-hover:bg-[length:100%_1px] transition-[background-size] duration-300 ease-out"
                      style={{ backgroundImage: 'linear-gradient(#3E9FFF, #3E9FFF)' }}
                    >
                      {post.title}
                    </span>
                  </h2>
                  {post.description && (
                    <p className="text-[13.5px] text-muted-foreground/85 mt-1.5 leading-[1.55] tracking-[-0.005em]">
                      {post.description}
                    </p>
                  )}
                  <div className="mt-2.5 text-[11px] text-muted-foreground/55 tabular-nums">
                    {post.readingTime} min
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {posts.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-16 text-center">
          Nothing tagged here yet — but every great repo starts with an empty folder.
        </p>
      )}
    </main>
  );
}
