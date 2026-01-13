import { Metadata } from 'next';
import Link from 'next/link';
import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';
import { ImageCard } from './ImageCard';
import type { CollectionPage, ItemList, ListItem, WebSite, WithContext } from 'schema-dts';

import {
  fetchDockerHubRepositories,
  fetchGHCRPackages,
  DockerHubRepository,
  GHCRPackage
} from '@/lib/container-registry';
import { ogUrls } from '@/lib/og-config';
import { JsonLd } from '@/components/seo/json-ld';
import { personSchema, personReference } from '@/lib/schema';

const BLUR_FADE_DELAY = 0.04;

const ogImageUrl = ogUrls.containerRegistry({
  image: 'Container Registry',
  description: 'Docker images via vanity domain',
});

export const metadata: Metadata = {
  title: 'Container Registry by Dipak Parmar',
  description:
    'Container registry vanity domain for Docker images by Dipak Parmar',
  openGraph: {
    title: 'Container Registry',
    description:
      'Container registry vanity domain for Docker images by Dipak Parmar',
    url: 'https://cr.dipak.io',
    siteName: 'cr.dipak.io',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Container Registry by Dipak Parmar'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Container Registry by Dipak Parmar',
    description:
      'Container registry vanity domain for Docker images by Dipak Parmar',
    images: [ogImageUrl]
  },
  alternates: {
    canonical: 'https://cr.dipak.io'
  }
};

const websiteSchema: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://cr.dipak.io#website',
  url: 'https://cr.dipak.io',
  name: 'Container Registry',
  description:
    'Container registry vanity domain for Docker images by Dipak Parmar',
  publisher: personReference
};

const pageSchema: WithContext<CollectionPage> = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': 'https://cr.dipak.io#collection',
  url: 'https://cr.dipak.io',
  name: 'Container Registry',
  description:
    'Container registry vanity domain for Docker images by Dipak Parmar',
  isPartOf: {
    '@id': 'https://cr.dipak.io#website'
  },
  mainEntity: {
    '@id': 'https://cr.dipak.io#images'
  }
};

// Revalidate every hour
export const revalidate = 3600;

interface ContainerImage {
  name: string;
  registry: 'docker' | 'ghcr';
  description: string;
  pullCount?: number;
  starCount?: number;
  lastUpdated?: string;
}

function formatDockerHubImage(repo: DockerHubRepository): ContainerImage {
  return {
    name: repo.name,
    registry: 'docker',
    description: repo.description || '',
    pullCount: repo.pull_count,
    starCount: repo.star_count,
    lastUpdated: repo.last_updated
  };
}

function formatGHCRImage(pkg: GHCRPackage): ContainerImage {
  return {
    name: pkg.name,
    registry: 'ghcr',
    description: pkg.repository?.full_name || '',
    lastUpdated: pkg.updated_at
  };
}

export default async function ContainerRegistryHome() {
  // Fetch images from both registries in parallel
  const [dockerHubRepos, ghcrPackages] = await Promise.all([
    fetchDockerHubRepositories(),
    fetchGHCRPackages()
  ]);

  const dockerImages = dockerHubRepos.map(formatDockerHubImage);
  const ghcrImages = ghcrPackages.map(formatGHCRImage);
  const allImages = [...dockerImages, ...ghcrImages];
  const imageListSchema: WithContext<ItemList> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://cr.dipak.io#images',
    name: 'Container Images',
    itemListElement: allImages.map(
      (image, index): ListItem => ({
        '@type': 'ListItem',
        position: index + 1,
        name: image.name,
        description: image.description,
        url: `https://cr.dipak.io/${image.registry}/${image.name}`
      })
    )
  };

  return (
    <>
      <JsonLd data={[personSchema, websiteSchema, imageListSchema, pageSchema]} />
      <main className="flex flex-col min-h-dvh space-y-10 w-full max-w-full overflow-hidden">
        <section id="hero">
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <div className="flex-col flex flex-1 space-y-1.5">
              <BlurFadeText
                delay={BLUR_FADE_DELAY}
                className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none"
                yOffset={8}
                text="Container Registry 🐳"
              />
              <BlurFadeText
                className="max-w-150 md:text-xl"
                delay={BLUR_FADE_DELAY * 2}
                text="Docker images via vanity domain"
              />
            </div>
          </div>
        </section>

      <section id="usage">
        <BlurFade delay={BLUR_FADE_DELAY * 3}>
          <h2 className="text-xl font-bold">Usage</h2>
        </BlurFade>
        <BlurFade delay={BLUR_FADE_DELAY * 4}>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                GitHub Container Registry
              </h3>
              <code className="block rounded-md bg-muted px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm overflow-x-auto">
                docker pull cr.dipak.io/ghcr/image:tag
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Docker Hub
              </h3>
              <code className="block rounded-md bg-muted px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm overflow-x-auto">
                docker pull cr.dipak.io/docker/image:tag
              </code>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Default (Docker Hub)
              </h3>
              <code className="block rounded-md bg-muted px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm overflow-x-auto">
                docker pull cr.dipak.io/image:tag
              </code>
            </div>
          </div>
        </BlurFade>
      </section>

      <section id="how-it-works">
        <BlurFade delay={BLUR_FADE_DELAY * 5}>
          <h2 className="text-xl font-bold">How It Works</h2>
        </BlurFade>
        <BlurFade delay={BLUR_FADE_DELAY * 6}>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground break-words">
            <p>
              This registry acts as a proxy to my container images on upstream
              registries. All images are served from{' '}
              <code className="text-foreground text-xs">dipakparmar/*</code>. The path
              prefix determines which backend registry to use:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li className="break-all">
                <code className="text-foreground text-xs">/ghcr/image</code> →{' '}
                <code className="text-foreground text-xs">
                  ghcr.io/dipakparmar/image
                </code>
              </li>
              <li className="break-all">
                <code className="text-foreground text-xs">/docker/image</code> →{' '}
                <code className="text-foreground text-xs">
                  docker.io/dipakparmar/image
                </code>
              </li>
              <li className="break-all">
                <code className="text-foreground text-xs">/image</code> →{' '}
                <code className="text-foreground text-xs">
                  docker.io/dipakparmar/image
                </code>{' '}
                (default)
              </li>
            </ul>
            <p className="mt-3">
              Manifests are proxied through this service, while blob downloads
              are redirected directly to the upstream registry for optimal
              performance.
            </p>
          </div>
        </BlurFade>
      </section>

      {/* Docker Hub Images */}
      {dockerImages.length > 0 && (
        <section id="docker-images" className="min-w-0">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <h2 className="text-xl font-bold">Docker Hub Images</h2>
          </BlurFade>
          <div className="mt-4 grid gap-4 min-w-0">
            {dockerImages.map((image, index) => (
              <BlurFade
                key={`docker-${image.name}`}
                delay={BLUR_FADE_DELAY * 8 + index * 0.05}
                className="min-w-0"
              >
                <ImageCard image={image} />
              </BlurFade>
            ))}
          </div>
        </section>
      )}

      {/* GHCR Images */}
      {ghcrImages.length > 0 && (
        <section id="ghcr-images" className="min-w-0">
          <BlurFade delay={BLUR_FADE_DELAY * 9}>
            <h2 className="text-xl font-bold">GitHub Container Registry</h2>
          </BlurFade>
          <div className="mt-4 grid gap-4 min-w-0">
            {ghcrImages.map((image, index) => (
              <BlurFade
                key={`ghcr-${image.name}`}
                delay={BLUR_FADE_DELAY * 10 + index * 0.05}
                className="min-w-0"
              >
                <ImageCard image={image} />
              </BlurFade>
            ))}
          </div>
        </section>
      )}

      {/* No images message */}
      {dockerImages.length === 0 && ghcrImages.length === 0 && (
        <section id="no-images">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <p className="text-sm text-muted-foreground">
              No container images found.
            </p>
          </BlurFade>
        </section>
      )}

      <footer className="mt-auto pt-16 pb-8">
        <BlurFade delay={BLUR_FADE_DELAY * 12}>
          <p className="text-center text-sm text-muted-foreground">
            Made with <span className="text-red-500">&#10084;&#65039;</span> by{' '}
            <Link
              href="https://dipak.tech"
              className="font-medium text-foreground hover:text-blue-500 transition-colors"
            >
              Dipak Parmar
            </Link>{' '}
            in Canada
          </p>
        </BlurFade>
      </footer>
      </main>
    </>
  );
}
