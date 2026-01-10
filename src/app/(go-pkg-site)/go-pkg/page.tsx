import { Metadata } from 'next';
import Link from 'next/link';
import { fetchGoPackages, Repo } from '@/lib/github';
import { PackageCard } from './PackageCard';
import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';

const BLUR_FADE_DELAY = 0.04;

export const metadata: Metadata = {
  title: 'Go Packages by Dipak Parmar',
  description: 'Collection of Go packages and libraries by Dipak Parmar',
  openGraph: {
    title: 'Go Packages by Dipak Parmar',
    description: 'Collection of Go packages and libraries by Dipak Parmar',
    url: 'https://go.pkg.dipak.io',
    siteName: 'go.pkg.dipak.io',
    type: 'website'
  },
  alternates: {
    canonical: 'https://go.pkg.dipak.io'
  }
};

export const revalidate = 3600;

export default async function GoPackagesHome() {
  const repositories = await fetchGoPackages();

  return (
    <main className="flex flex-col min-h-dvh space-y-10">
      <section id="hero">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <div className="flex-col flex flex-1 space-y-1.5">
            <BlurFadeText
              delay={BLUR_FADE_DELAY}
              className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none"
              yOffset={8}
              text="Go Packages 📦"
            />
            <BlurFadeText
              className="max-w-150 md:text-xl"
              delay={BLUR_FADE_DELAY * 2}
              text="Collection of Go packages and libraries"
            />
          </div>
        </div>
      </section>

      <section id="install">
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <h2 className="text-xl font-bold">Installation</h2>
        </BlurFade>
        <BlurFade delay={BLUR_FADE_DELAY * 4}>
          <p className="text-sm text-muted-foreground mt-2">
            Install any package with{' '}
            <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">
              go get go.pkg.dipak.io/package-name
            </code>
          </p>
        </BlurFade>
      </section>

      <section id="packages">
        <BlurFade delay={BLUR_FADE_DELAY * 5}>
          <h2 className="text-xl font-bold">Packages</h2>
        </BlurFade>
        <div className="mt-4 grid gap-4">
          {repositories.map((repo: Repo, index: number) => (
            <BlurFade key={repo.id} delay={BLUR_FADE_DELAY * 6 + index * 0.05}>
              <PackageCard repo={repo} />
            </BlurFade>
          ))}
        </div>

        {repositories.length === 0 && (
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <p className="mt-4 text-sm text-muted-foreground">
              No Go packages found.
            </p>
          </BlurFade>
        )}
      </section>

      <footer className="mt-auto pt-16 pb-8">
        <BlurFade delay={BLUR_FADE_DELAY * 10}>
          <p className="text-center text-sm text-muted-foreground">
            Made with <span className="text-red-500">❤️</span> by{' '}
            <Link
              href="https://dipak.tech"
              className="font-medium text-foreground hover:text-blue-500 transition-colors"
            >
              Dipak Parmar
            </Link>{' '}
            in Canada 🇨🇦
          </p>
        </BlurFade>
      </footer>
    </main>
  );
}
