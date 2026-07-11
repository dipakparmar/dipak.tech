import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  type NormalizedCacheObject
} from '@apollo/client';
import { clsx, type ClassValue } from 'clsx';
import { unstable_noStore as noStore } from 'next/cache';
import { twMerge } from 'tailwind-merge';

type ApolloCacheState = NormalizedCacheObject;
type ApolloHeaders = Record<string, string>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  noStore();
  const currentDate = new Date().getTime();
  if (!date.includes('T')) {
    date = `${date}T00:00:00`;
  }
  const targetDate = new Date(date).getTime();
  const timeDifference = Math.abs(currentDate - targetDate);
  const daysAgo = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  const fullDate = new Date(date).toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (daysAgo < 1) {
    return 'Today';
  } else if (daysAgo < 7) {
    return `${fullDate} (${daysAgo}d ago)`;
  } else if (daysAgo < 30) {
    const weeksAgo = Math.floor(daysAgo / 7);
    return `${fullDate} (${weeksAgo}w ago)`;
  } else if (daysAgo < 365) {
    const monthsAgo = Math.floor(daysAgo / 30);
    return `${fullDate} (${monthsAgo}mo ago)`;
  } else {
    const yearsAgo = Math.floor(daysAgo / 365);
    return `${fullDate} (${yearsAgo}y ago)`;
  }
}

export function createApolloClient({
  initialState,
  headers,
  endpoint
}: {
  initialState: ApolloCacheState;
  headers: ApolloHeaders;
  endpoint: string;
}) {
  const ssrMode = typeof window === 'undefined';
  const link = new HttpLink({
    uri: endpoint,
    headers
  });

  return new ApolloClient({
    ssrMode,
    link,
    cache: new InMemoryCache().restore(initialState)
  });
}
