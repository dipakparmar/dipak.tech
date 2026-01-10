export interface RepoOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface RepoLicense {
  key: string;
  name: string;
  spdx_id: string;
  url: string;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: RepoOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  topics?: string[] | null;
  license: RepoLicense | null;
  visibility: string;
  default_branch: string;
}

export interface RepoSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: Repo[] | null;
}

const GITHUB_USERNAME = 'dipakparmar';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const STALE_TTL = 24 * 3600 * 1000; // 24 hours - serve stale if fresh fails

// In-memory cache with stale-while-revalidate
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  const isStale = age > CACHE_TTL;
  const isExpired = age > STALE_TTL;

  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return { data: entry.data, isStale };
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit & { next?: { revalidate: number } },
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Retry on server errors (502, 503, 504)
      if (response.status >= 502 && response.status <= 504) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `GitHub API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if ((error as Error).name === 'AbortError') {
        console.warn(
          `GitHub API request timed out (attempt ${attempt + 1}/${retries})`
        );
      }

      if (attempt < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`Retrying GitHub API request in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch from GitHub API');
}

export async function repoExists(repoName: string): Promise<boolean> {
  if (!repoName) return false;

  const cacheKey = `repo:${repoName}`;
  const cached = getCached<boolean>(cacheKey);

  // Return fresh cache immediately
  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const result = await fetchWithRetry(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'go.pkg.dipak.io/1.0.0'
        },
        next: { revalidate: 3600 }
      }
    );

    const exists = result.status === 200;
    setCache(cacheKey, exists);
    return exists;
  } catch (error) {
    console.error('Failed to check repo existence:', error);

    // Return stale cache if available
    if (cached) {
      console.warn(`Serving stale cache for repo: ${repoName}`);
      return cached.data;
    }

    return false;
  }
}

export async function fetchGoPackages(): Promise<Repo[]> {
  const cacheKey = 'go-packages';
  const cached = getCached<Repo[]>(cacheKey);

  // Return fresh cache immediately
  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const res = await fetchWithRetry(
      `https://api.github.com/search/repositories?q=user:${GITHUB_USERNAME}+language:Go&type=Repositories`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'go.pkg.dipak.io/1.0.0'
        },
        next: { revalidate: 3600 }
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch Go packages:', res.status);

      // Return stale cache if available
      if (cached) {
        console.warn('Serving stale cache for Go packages');
        return cached.data;
      }

      return [];
    }

    const data: RepoSearchResponse = await res.json();
    const packages = data?.items || [];

    // Update cache on successful fetch
    setCache(cacheKey, packages);
    return packages;
  } catch (error) {
    console.error('Failed to fetch Go packages:', error);

    // Return stale cache if available
    if (cached) {
      console.warn('Serving stale cache for Go packages');
      return cached.data;
    }

    return [];
  }
}

export function buildGoImportMeta(pkgName: string): string {
  // go-import meta tag must always use the repository root URL per Go vanity import spec
  return `go.pkg.dipak.io/${pkgName} git https://github.com/${GITHUB_USERNAME}/${pkgName}`;
}

export function getGitHubUrl(pkgName: string): string {
  return `https://github.com/${GITHUB_USERNAME}/${pkgName}`;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
  html_url: string;
}

export async function fetchRepoDetails(repoName: string): Promise<Repo | null> {
  if (!repoName) return null;

  const cacheKey = `repo-details:${repoName}`;
  const cached = getCached<Repo>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const res = await fetchWithRetry(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'go.pkg.dipak.io/1.0.0'
        },
        next: { revalidate: 3600 }
      }
    );

    if (!res.ok) {
      if (cached) {
        console.warn(`Serving stale cache for repo details: ${repoName}`);
        return cached.data;
      }
      return null;
    }

    const repo: Repo = await res.json();
    setCache(cacheKey, repo);
    return repo;
  } catch (error) {
    console.error('Failed to fetch repo details:', error);
    if (cached) {
      console.warn(`Serving stale cache for repo details: ${repoName}`);
      return cached.data;
    }
    return null;
  }
}

export async function fetchReadme(repoName: string): Promise<string | null> {
  if (!repoName) return null;

  const cacheKey = `readme:${repoName}`;
  const cached = getCached<string>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const res = await fetchWithRetry(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/readme`,
      {
        headers: {
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'go.pkg.dipak.io/1.0.0'
        },
        next: { revalidate: 3600 }
      }
    );

    if (!res.ok) {
      if (cached) {
        console.warn(`Serving stale cache for readme: ${repoName}`);
        return cached.data;
      }
      return null;
    }

    const content = await res.text();
    setCache(cacheKey, content);
    return content;
  } catch (error) {
    console.error('Failed to fetch readme:', error);
    if (cached) {
      console.warn(`Serving stale cache for readme: ${repoName}`);
      return cached.data;
    }
    return null;
  }
}

export async function fetchReleases(repoName: string): Promise<Release[]> {
  if (!repoName) return [];

  const cacheKey = `releases:${repoName}`;
  const cached = getCached<Release[]>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const res = await fetchWithRetry(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/releases`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'go.pkg.dipak.io/1.0.0'
        },
        next: { revalidate: 3600 }
      }
    );

    if (!res.ok) {
      if (cached) {
        console.warn(`Serving stale cache for releases: ${repoName}`);
        return cached.data;
      }
      return [];
    }

    const releases: Release[] = await res.json();
    // Filter out drafts
    const publicReleases = releases.filter((r) => !r.draft);
    setCache(cacheKey, publicReleases);
    return publicReleases;
  } catch (error) {
    console.error('Failed to fetch releases:', error);
    if (cached) {
      console.warn(`Serving stale cache for releases: ${repoName}`);
      return cached.data;
    }
    return [];
  }
}
