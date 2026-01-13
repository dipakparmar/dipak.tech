import type { Person, WithContext } from 'schema-dts';

import { DATA } from '@/data/data';

export const personId = `${DATA.url}#person`;

export const personReference: Person = {
  '@type': 'Person',
  '@id': personId,
  name: DATA.name,
  url: DATA.url
};

export const personSchema: WithContext<Person> = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': personId,
  name: DATA.name,
  url: DATA.url,
  image: DATA.avatarUrl,
  jobTitle: 'DevSecOps Engineer',
  description: DATA.description,
  email: DATA.contact.email,
  sameAs: Object.values(DATA.contact.social).map((social) => social.url)
};
