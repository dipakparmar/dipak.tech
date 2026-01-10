import { Metadata } from 'next';
import Link from 'next/link';
import { fetchGoPackages, Repo } from '@/lib/github';
import { PackageCard } from './PackageCard';
import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';

const BLUR_FADE_DELAY = 0.04;

export const metadata: Metadata = {
  title: 'Go Packages by Dipak Parmar',
  description:
    'Vanity import domain for Go packages owned and maintained by Dipak Parmar',
  openGraph: {
    title: 'Go Packages by Dipak Parmar',
    description:
      'Vanity import domain for Go packages owned and maintained by Dipak Parmar',
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
              text="My Go packages via vanity import path"
            />
          </div>
        </div>
      </section>

      <section id="about">
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <p className="text-sm text-muted-foreground">
            Vanity import domain for Go packages I own and maintain. All
            packages listed here are from my GitHub ({' '}
            <Link
              href="https://github.com/dipakparmar"
              className="text-foreground hover:text-blue-500 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              @dipakparmar
            </Link>
            ).
          </p>
        </BlurFade>
      </section>

      <section id="install">
        <BlurFade delay={BLUR_FADE_DELAY * 4}>
          <h2 className="text-xl font-bold">Usage</h2>
        </BlurFade>
        <BlurFade delay={BLUR_FADE_DELAY * 5}>
          <p className="text-sm text-muted-foreground mt-2">
            Import packages using the vanity path:
          </p>
          <code className="block rounded-md bg-muted px-4 py-3 font-mono text-sm mt-2">
            go get go.pkg.dipak.io/package-name
          </code>
        </BlurFade>
      </section>

      <section id="packages">
        <BlurFade delay={BLUR_FADE_DELAY * 6}>
          <h2 className="text-xl font-bold">My Packages</h2>
        </BlurFade>
        <div className="mt-4 grid gap-4">
          {repositories.map((repo: Repo, index: number) => (
            <BlurFade key={repo.id} delay={BLUR_FADE_DELAY * 7 + index * 0.05}>
              <PackageCard repo={repo} />
            </BlurFade>
          ))}
        </div>

        {repositories.length === 0 && (
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
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
