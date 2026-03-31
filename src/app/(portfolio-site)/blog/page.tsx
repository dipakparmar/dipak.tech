import { getAllPosts, getAllTags } from '@/lib/blog';
import { Metadata } from 'next';
import type { WithContext, CollectionPage } from 'schema-dts';
import { JsonLd } from '@/components/seo/json-ld';
import { personReference } from '@/lib/schema';
import { BlogList } from './blog-list';

export const metadata: Metadata = {
  title: 'Blog | Dipak Parmar',
  description: 'Writings on software engineering, infrastructure, and DevSecOps.',
  alternates: {
    canonical: 'https://dipak.tech/blog',
  },
};

const pageSchema: WithContext<CollectionPage> = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': 'https://dipak.tech/blog#page',
  url: 'https://dipak.tech/blog',
  name: 'Blog | Dipak Parmar',
  description: 'Writings on software engineering, infrastructure, and DevSecOps.',
  author: personReference,
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <>
      <JsonLd data={pageSchema} />
      <BlogList posts={posts} tags={tags} />
    </>
  );
}
