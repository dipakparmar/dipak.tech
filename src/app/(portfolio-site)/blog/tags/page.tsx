import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllTags } from '@/lib/blog';
import { BlurFade } from '@/components/magicui/blur-fade';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags | Blog | Dipak Parmar',
  description: 'Browse blog posts by tag.',
  alternates: {
    canonical: 'https://dipak.tech/blog/tags',
  },
};

const BLUR_FADE_DELAY = 0.04;

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <main className="min-h-dvh">
      <BlurFade delay={BLUR_FADE_DELAY}>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 group"
        >
          <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
          Back to blog
        </Link>
      </BlurFade>

      <BlurFade delay={BLUR_FADE_DELAY * 2}>
        <h1 className="text-3xl font-bold tracking-tighter mb-8">Tags</h1>
      </BlurFade>

      <div className="flex flex-wrap gap-2.5">
        {tags.map((tag, i) => (
          <BlurFade key={tag.name} delay={BLUR_FADE_DELAY * 3 + i * 0.05}>
            <Link
              href={`/blog/tags/${tag.name}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 border border-border px-3.5 py-2 rounded-lg hover:text-foreground hover:bg-muted hover:border-foreground/10 transition-all"
            >
              {tag.name}
              <span className="text-xs text-muted-foreground/40 tabular-nums">
                {tag.count}
              </span>
            </Link>
          </BlurFade>
        ))}
      </div>

      {tags.length === 0 && (
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <p className="text-sm text-muted-foreground italic py-16 text-center">
            No tags yet — like an empty commit history. Give it time.
          </p>
        </BlurFade>
      )}
    </main>
  );
}
