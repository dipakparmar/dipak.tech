import { Metadata } from 'next';
import type { ProfilePage, WebSite, WithContext } from 'schema-dts';

import { Portfolio } from '@/components/portfolio';
import { JsonLd } from '@/components/seo/json-ld';
import { DATA } from '@/data/data';
import { personSchema, personReference } from '@/lib/schema';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://dipak.tech/resume'
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

const profilePageSchema: WithContext<ProfilePage> = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  '@id': 'https://dipak.tech/resume#profile',
  url: 'https://dipak.tech/resume',
  name: 'Resume | Dipak Parmar',
  description: DATA.description,
  isPartOf: {
    '@id': 'https://dipak.tech#website'
  },
  about: personReference,
  mainEntity: personReference
};

export default function Resume() {
  return (
    <>
      <JsonLd data={[personSchema, websiteSchema, profilePageSchema]} />
      <Portfolio />
    </>
  );
}
