import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getAllPosts, getAllTags } from '@/lib/blog';
import {
  buildCanonicalUrl,
  detectHost,
  type HostKey,
  getCanonicalBaseUrl
} from '@/lib/host-routing';

function getPostLastModified(date: string): Date {
  return new Date(date);
}

function getLatestBlogPostDate() {
  const posts = getAllPosts();
  return posts[0]
    ? getPostLastModified(posts[0].updated ?? posts[0].date)
    : undefined;
}

function getLatestTagDate(tagName: string) {
  const posts = getAllPosts().filter((post) => post.tags.includes(tagName));
  return posts[0]
    ? getPostLastModified(posts[0].updated ?? posts[0].date)
    : undefined;
}

function portfolioEntries(): MetadataRoute.Sitemap {
  const latestBlogDate = getLatestBlogPostDate();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: buildCanonicalUrl('portfolio'),
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: buildCanonicalUrl('portfolio', '/resume'),
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: buildCanonicalUrl('portfolio', '/blog'),
      ...(latestBlogDate && { lastModified: latestBlogDate }),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: buildCanonicalUrl('portfolio', '/blog/tags'),
      ...(latestBlogDate && { lastModified: latestBlogDate }),
      changeFrequency: 'weekly',
      priority: 0.6
    }
  ];

  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: buildCanonicalUrl('portfolio', `/blog/${post.slug}`),
    lastModified: getPostLastModified(post.updated ?? post.date),
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  const tagEntries: MetadataRoute.Sitemap = getAllTags().map((tag) => ({
    url: buildCanonicalUrl('portfolio', `/blog/tags/${tag.name}`),
    ...(getLatestTagDate(tag.name) && {
      lastModified: getLatestTagDate(tag.name)
    }),
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  return [...staticEntries, ...blogEntries, ...tagEntries];
}

function toolsEntries(): MetadataRoute.Sitemap {
  return [
    {
      url: buildCanonicalUrl('tools'),
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      url: buildCanonicalUrl('tools', '/apple-secret-generator'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: buildCanonicalUrl('tools', '/certificates'),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: buildCanonicalUrl('tools', '/github-release-notes'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: buildCanonicalUrl('tools', '/message-header-analyzer'),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: buildCanonicalUrl('tools', '/osint'),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: buildCanonicalUrl('tools', '/password-generator'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: buildCanonicalUrl('tools', '/timeoff-optimizer'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: buildCanonicalUrl('tools', '/web-terminal'),
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ];
}

function singlePageEntry(
  hostKey: HostKey,
  priority: number
): MetadataRoute.Sitemap {
  return [
    {
      url: getCanonicalBaseUrl(hostKey),
      changeFrequency: 'weekly',
      priority
    }
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers();
  const hostHeader = headerStore.get('host');
  const host = detectHost(hostHeader) ?? 'portfolio';

  switch (host) {
    case 'tools':
      return toolsEntries();
    case 'ip':
      return singlePageEntry('ip', 0.8);
    case 'whois':
      return singlePageEntry('whois', 0.8);
    case 'goPkg':
      return singlePageEntry('goPkg', 0.7);
    case 'containerRegistry':
      return singlePageEntry('containerRegistry', 0.7);
    case 'links':
      return singlePageEntry('links', 0.7);
    case 'portfolio':
    default:
      return portfolioEntries();
  }
}
