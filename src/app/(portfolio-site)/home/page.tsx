import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';
import { DATA } from '@/data/data';
import Link from 'next/link';
import { Streamdown } from 'streamdown';
import { Metadata } from 'next';
import type { WebPage, WebSite, WithContext } from 'schema-dts';

import { JsonLd } from '@/components/seo/json-ld';
import { personSchema, personReference } from '@/lib/schema';

const BLUR_FADE_DELAY = 0.04;

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://dipak.tech/'
  }
};

const websiteSchema: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://dipak.tech#website',
  url: 'https://dipak.tech',
  name: 'Dipak Parmar',
  description: DATA.description,
  publisher: personReference
};

const pageSchema: WithContext<WebPage> = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://dipak.tech/#webpage',
  url: 'https://dipak.tech/',
  name: 'Dipak Parmar | ☁️ DevSecOps Engineer | @iamdipakparmar',
  description: DATA.description,
  isPartOf: {
    '@id': 'https://dipak.tech#website'
  },
  about: personReference
};

export default function Home() {
  return (
    <>
      <JsonLd data={[personSchema, websiteSchema, pageSchema]} />
      <main className="flex flex-col min-h-dvh space-y-10">
        <section id="hero">
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <div className="gap-2 flex justify-between">
              <div className="flex-col flex flex-1 space-y-1.5">
                <BlurFade delay={BLUR_FADE_DELAY}>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Hi, I&apos;m {DATA.name.split(' ')[0]}{' '}
                    <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
                  </h1>
                </BlurFade>
                <BlurFadeText
                  className="max-w-150 md:text-xl"
                  delay={BLUR_FADE_DELAY}
                  text={DATA.description}
                />
              </div>
              <BlurFade delay={BLUR_FADE_DELAY}>
                <Avatar className="size-28 border">
                  <AvatarImage alt={DATA.name} src={DATA.avatarUrl} />
                  <AvatarFallback>{DATA.initials}</AvatarFallback>
                </Avatar>
              </BlurFade>
            </div>
          </div>
        </section>
        <section id="about">
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <h2 className="text-xl font-bold">About</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div className="prose max-w-full text-pretty font-sans text-sm text-muted-foreground dark:prose-invert">
              <Streamdown>{DATA.summary}</Streamdown>
            </div>
          </BlurFade>
        </section>
        <section id="contact">
          <div className="grid items-center justify-center gap-2 px-4 text-center md:px-6 w-full py-12">
            <BlurFade delay={BLUR_FADE_DELAY * 16}>
              <div className="space-y-3">
                <div className="inline-block rounded-lg bg-primary text-primary-foreground px-3 py-1 text-sm">
                  Contact
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Get in Touch
                </h2>
                <p className="mx-auto max-w-150 text-muted-foreground md:text-sm/relaxed lg:text-sm/relaxed xl:text-sm/relaxed">
                  Interested in connecting? Feel free to reach out with a direct
                  question via{' '}
                  <Link
                    href={DATA.contact.social.X.url}
                    className="text-primary hover:underline"
                  >
                    Twitter
                  </Link>{' '}
                  or{' '}
                  <Link
                    href={DATA.contact.social.LinkedIn.url}
                    className="text-primary hover:underline"
                  >
                    Linkedin
                  </Link>
                  . I&apos;m always open to new opportunities and collaborations,
                  and I&apos;ll do my best to respond promptly. Please note that I
                  do not engage with unsolicited offers or advertisements.
                </p>
              </div>
            </BlurFade>
          </div>
        </section>
      </main>
    </>
  );
}
