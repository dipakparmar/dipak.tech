import Link from 'next/link';
import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';

const BLUR_FADE_DELAY = 0.04;

export default function PackageNotFound() {
  return (
    <main className="flex flex-col min-h-dvh items-center justify-center space-y-6">
      <BlurFadeText
        delay={BLUR_FADE_DELAY}
        className="text-6xl font-bold tracking-tighter"
        yOffset={8}
        text="404"
      />
      <BlurFade delay={BLUR_FADE_DELAY * 2}>
        <p className="text-muted-foreground">Package not found</p>
      </BlurFade>
      <BlurFade delay={BLUR_FADE_DELAY * 3}>
        <Link
          href="/go-pkg"
          className="text-sm text-blue-500 hover:underline"
        >
          ← Back to all packages
        </Link>
      </BlurFade>
    </main>
  );
}
