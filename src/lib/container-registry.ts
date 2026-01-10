import { NextResponse } from 'next/server';

// Registry backend types
export type RegistryBackend = 'ghcr' | 'docker';

// Cache configuration
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const STALE_TTL = 24 * 3600 * 1000; // 24 hours - serve stale if fresh fails

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

export interface RegistryConfig {
  name: string;
  baseUrl: string;
  authUrl: string;
  service: string;
}

export const REGISTRY_BACKENDS: Record<RegistryBackend, RegistryConfig> = {
  ghcr: {
    name: 'GitHub Container Registry',
    baseUrl: 'https://ghcr.io',
    authUrl: 'https://ghcr.io/token',
    service: 'ghcr.io'
  },
  docker: {
    name: 'Docker Hub',
    baseUrl: 'https://registry-1.docker.io',
    authUrl: 'https://auth.docker.io/token',
    service: 'registry.docker.io'
  }
};

export const DEFAULT_REGISTRY: RegistryBackend = 'docker';
export const GITHUB_USERNAME = 'dipakparmar';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Token cache for anonymous tokens
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Fetch an anonymous token for public image access.
 * Works for both Docker Hub and GHCR public images.
 */
async function fetchAnonymousToken(
  registry: RegistryBackend,
  imageName: string,
  actions: string = 'pull'
): Promise<string | null> {
  const config = REGISTRY_BACKENDS[registry];
  const scope = `repository:${imageName}:${actions}`;
  const cacheKey = `${registry}:${scope}`;

  // Check cache
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    const tokenUrl = new URL(config.authUrl);
    tokenUrl.searchParams.set('service', config.service);
    tokenUrl.searchParams.set('scope', scope);

    const response = await fetch(tokenUrl.toString(), {
      headers: {
        'User-Agent': 'cr.dipak.io/1.0.0'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch anonymous token: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const token = data.token || data.access_token;

    if (token) {
      // Cache token (default 5 min expiry if not specified)
      const expiresIn = data.expires_in || 300;
      tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + expiresIn * 1000 - 30000 // 30s buffer
      });
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error fetching anonymous token:', error);
    return null;
  }
}

// Parsed registry path information
export interface ParsedRegistryPath {
  registry: RegistryBackend;
  imageName: string; // Full image name including owner (e.g., dipakparmar/myimage)
  endpoint: 'manifests' | 'blobs' | 'tags';
  reference: string; // tag, digest, or 'list' for tags
}

/**
 * Parse the incoming path segments to extract registry and image info.
 * This registry only serves images owned by GITHUB_USERNAME (dipakparmar).
 *
 * Path format: /v2/{registry}/{image}/{endpoint}/{reference}
 * Examples:
 *   /v2/ghcr/myimage/manifests/latest → ghcr.io/dipakparmar/myimage
 *   /v2/docker/myimage/blobs/sha256:abc → docker.io/dipakparmar/myimage
 *   /v2/myimage/manifests/latest → docker.io/dipakparmar/myimage (default)
 */
export function parseRegistryPath(pathSegments: string[]): ParsedRegistryPath | null {
  if (pathSegments.length < 3) {
    return null;
  }

  let registry: RegistryBackend;
  let imageNamePart: string;
  let endpointIndex: number;

  // Check if first segment is a registry prefix
  if (pathSegments[0] === 'ghcr' || pathSegments[0] === 'docker') {
    registry = pathSegments[0] as RegistryBackend;
    // Find the endpoint (manifests, blobs, tags)
    endpointIndex = pathSegments.findIndex(
      (s) => s === 'manifests' || s === 'blobs' || s === 'tags'
    );
    if (endpointIndex === -1 || endpointIndex < 2) {
      return null;
    }
    // Image name is everything between registry prefix and endpoint
    imageNamePart = pathSegments.slice(1, endpointIndex).join('/');
  } else {
    // Default registry (ghcr)
    registry = DEFAULT_REGISTRY;
    endpointIndex = pathSegments.findIndex(
      (s) => s === 'manifests' || s === 'blobs' || s === 'tags'
    );
    if (endpointIndex === -1 || endpointIndex < 1) {
      return null;
    }
    // Image name is everything before endpoint
    imageNamePart = pathSegments.slice(0, endpointIndex).join('/');
  }

  const endpoint = pathSegments[endpointIndex] as 'manifests' | 'blobs' | 'tags';
  const reference = pathSegments.slice(endpointIndex + 1).join('/');

  if (!reference || !imageNamePart) {
    return null;
  }

  // Always use GITHUB_USERNAME as the owner - this registry only serves our images
  const imageName = `${GITHUB_USERNAME}/${imageNamePart}`;

  return {
    registry,
    imageName,
    endpoint,
    reference
  };
}

/**
 * Build the backend URL for a registry request.
 */
export function buildBackendUrl(
  registry: RegistryBackend,
  imageName: string,
  endpoint: string,
  reference: string
): string {
  const config = REGISTRY_BACKENDS[registry];
  return `${config.baseUrl}/v2/${imageName}/${endpoint}/${reference}`;
}

/**
 * Build WWW-Authenticate header for 401 responses.
 */
export function buildAuthenticateHeader(
  registry: RegistryBackend,
  imageName: string,
  actions: string = 'pull'
): string {
  const config = REGISTRY_BACKENDS[registry];
  const scope = `repository:${imageName}:${actions}`;
  return `Bearer realm="${config.authUrl}",service="${config.service}",scope="${scope}"`;
}

/**
 * Create an OCI-compliant error response.
 */
export function registryError(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    {
      errors: [
        {
          code,
          message,
          detail: null
        }
      ]
    },
    {
      status,
      headers: {
        'Docker-Distribution-API-Version': 'registry/2.0',
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Fetch with retry logic and exponential backoff.
 */
export async function registryFetch(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Retry on server errors (502, 503, 504)
      if (response.status >= 502 && response.status <= 504) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `Registry returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if ((error as Error).name === 'AbortError') {
        console.warn(
          `Registry request timed out (attempt ${attempt + 1}/${retries})`
        );
      }

      if (attempt < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`Retrying registry request in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch from registry');
}

/**
 * Proxy a manifest request to the backend registry.
 * Automatically fetches anonymous token for public images on 401.
 */
export async function proxyManifest(
  registry: RegistryBackend,
  imageName: string,
  reference: string,
  authHeader: string | null,
  acceptHeader: string | null
): Promise<NextResponse> {
  const url = buildBackendUrl(registry, imageName, 'manifests', reference);

  const buildHeaders = (auth: string | null): HeadersInit => {
    const headers: HeadersInit = {
      'User-Agent': 'cr.dipak.io/1.0.0'
    };

    // Forward Accept header for proper manifest type
    if (acceptHeader) {
      headers['Accept'] = acceptHeader;
    } else {
      headers['Accept'] = [
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.oci.image.index.v1+json',
        '*/*'
      ].join(', ');
    }

    if (auth) {
      headers['Authorization'] = auth;
    }

    return headers;
  };

  try {
    // First attempt with client's auth header (if any)
    let response = await registryFetch(url, {
      method: 'GET',
      headers: buildHeaders(authHeader)
    });

    // If 401 and client didn't provide auth, try fetching anonymous token
    if (response.status === 401 && !authHeader) {
      const token = await fetchAnonymousToken(registry, imageName);
      if (token) {
        response = await registryFetch(url, {
          method: 'GET',
          headers: buildHeaders(`Bearer ${token}`)
        });
      }
    }

    // Still 401 - return auth challenge to client
    if (response.status === 401) {
      const wwwAuth = buildAuthenticateHeader(registry, imageName);
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': wwwAuth,
          'Docker-Distribution-API-Version': 'registry/2.0'
        }
      });
    }

    // Handle not found
    if (response.status === 404) {
      return registryError('MANIFEST_UNKNOWN', 'manifest unknown', 404);
    }

    // Proxy the response
    const body = await response.arrayBuffer();
    const responseHeaders = new Headers();

    // Copy relevant headers
    const headersToCopy = [
      'Content-Type',
      'Docker-Content-Digest',
      'Content-Length',
      'ETag'
    ];
    for (const header of headersToCopy) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }
    responseHeaders.set('Docker-Distribution-API-Version', 'registry/2.0');

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Failed to proxy manifest:', error);
    return registryError(
      'MANIFEST_UNKNOWN',
      'failed to fetch manifest from upstream',
      502
    );
  }
}

/**
 * Handle HEAD request for manifest (Docker checks manifest existence first).
 * Automatically fetches anonymous token for public images on 401.
 */
export async function headManifest(
  registry: RegistryBackend,
  imageName: string,
  reference: string,
  authHeader: string | null,
  acceptHeader: string | null
): Promise<NextResponse> {
  const url = buildBackendUrl(registry, imageName, 'manifests', reference);

  const buildHeaders = (auth: string | null): HeadersInit => {
    const headers: HeadersInit = {
      'User-Agent': 'cr.dipak.io/1.0.0'
    };

    if (acceptHeader) {
      headers['Accept'] = acceptHeader;
    } else {
      headers['Accept'] = [
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.oci.image.index.v1+json',
        '*/*'
      ].join(', ');
    }

    if (auth) {
      headers['Authorization'] = auth;
    }

    return headers;
  };

  try {
    let response = await registryFetch(url, {
      method: 'HEAD',
      headers: buildHeaders(authHeader)
    });

    // If 401 and client didn't provide auth, try fetching anonymous token
    if (response.status === 401 && !authHeader) {
      const token = await fetchAnonymousToken(registry, imageName);
      if (token) {
        response = await registryFetch(url, {
          method: 'HEAD',
          headers: buildHeaders(`Bearer ${token}`)
        });
      }
    }

    if (response.status === 401) {
      const wwwAuth = buildAuthenticateHeader(registry, imageName);
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': wwwAuth,
          'Docker-Distribution-API-Version': 'registry/2.0'
        }
      });
    }

    if (response.status === 404) {
      return registryError('MANIFEST_UNKNOWN', 'manifest unknown', 404);
    }

    const responseHeaders = new Headers();
    const headersToCopy = [
      'Content-Type',
      'Docker-Content-Digest',
      'Content-Length',
      'ETag'
    ];
    for (const header of headersToCopy) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }
    responseHeaders.set('Docker-Distribution-API-Version', 'registry/2.0');

    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Failed to HEAD manifest:', error);
    return registryError(
      'MANIFEST_UNKNOWN',
      'failed to check manifest from upstream',
      502
    );
  }
}

/**
 * Get redirect URL for blob download. Returns 307 redirect to signed URL.
 * Uses GET with redirect:manual because Docker Hub only returns signed URLs on GET, not HEAD.
 * Automatically fetches anonymous token for public images on 401.
 */
export async function getBlobRedirect(
  registry: RegistryBackend,
  imageName: string,
  digest: string,
  authHeader: string | null
): Promise<NextResponse> {
  const url = buildBackendUrl(registry, imageName, 'blobs', digest);

  const buildHeaders = (auth: string | null): HeadersInit => {
    const headers: HeadersInit = {
      'User-Agent': 'cr.dipak.io/1.0.0'
    };
    if (auth) {
      headers['Authorization'] = auth;
    }
    return headers;
  };

  // Determine auth to use - fetch anonymous token if needed
  let authToUse = authHeader;
  if (!authHeader) {
    const token = await fetchAnonymousToken(registry, imageName);
    if (token) {
      authToUse = `Bearer ${token}`;
    }
  }

  try {
    // Use GET with redirect:manual to get the signed URL
    // Docker Hub returns 307 to signed Cloudflare/S3 URL on GET, not HEAD
    const response = await registryFetch(url, {
      method: 'GET',
      headers: buildHeaders(authToUse),
      redirect: 'manual'
    });

    if (response.status === 401) {
      const wwwAuth = buildAuthenticateHeader(registry, imageName);
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': wwwAuth,
          'Docker-Distribution-API-Version': 'registry/2.0'
        }
      });
    }

    if (response.status === 404) {
      return registryError('BLOB_UNKNOWN', 'blob unknown to registry', 404);
    }

    // Backend should return redirect to signed URL
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('Location');
      if (location) {
        return NextResponse.redirect(location, 307);
      }
    }

    // If no redirect (unusual), proxy the response headers for client to re-request
    // This shouldn't normally happen for blob GETs
    const responseHeaders = new Headers();
    responseHeaders.set('Docker-Distribution-API-Version', 'registry/2.0');
    const digest = response.headers.get('Docker-Content-Digest');
    if (digest) {
      responseHeaders.set('Docker-Content-Digest', digest);
    }

    return new NextResponse(null, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Failed to get blob redirect:', error);
    return registryError(
      'BLOB_UNKNOWN',
      'failed to fetch blob from upstream',
      502
    );
  }
}

/**
 * Handle tags list request.
 * Automatically fetches anonymous token for public images on 401.
 */
export async function listTags(
  registry: RegistryBackend,
  imageName: string,
  authHeader: string | null
): Promise<NextResponse> {
  const url = buildBackendUrl(registry, imageName, 'tags', 'list');

  const buildHeaders = (auth: string | null): HeadersInit => {
    const headers: HeadersInit = {
      'User-Agent': 'cr.dipak.io/1.0.0',
      Accept: 'application/json'
    };
    if (auth) {
      headers['Authorization'] = auth;
    }
    return headers;
  };

  try {
    let response = await registryFetch(url, {
      method: 'GET',
      headers: buildHeaders(authHeader)
    });

    // If 401 and client didn't provide auth, try fetching anonymous token
    if (response.status === 401 && !authHeader) {
      const token = await fetchAnonymousToken(registry, imageName);
      if (token) {
        response = await registryFetch(url, {
          method: 'GET',
          headers: buildHeaders(`Bearer ${token}`)
        });
      }
    }

    if (response.status === 401) {
      const wwwAuth = buildAuthenticateHeader(registry, imageName);
      return new NextResponse(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': wwwAuth,
          'Docker-Distribution-API-Version': 'registry/2.0'
        }
      });
    }

    if (response.status === 404) {
      return registryError('NAME_UNKNOWN', 'repository name not known', 404);
    }

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Docker-Distribution-API-Version': 'registry/2.0'
      }
    });
  } catch (error) {
    console.error('Failed to list tags:', error);
    return registryError('NAME_UNKNOWN', 'failed to list tags from upstream', 502);
  }
}

// =============================================================================
// Docker Hub API - For listing repositories and tags on the landing page
// =============================================================================

export interface DockerHubRepository {
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  status_description: string;
  description: string | null;
  is_private: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
}

export interface DockerHubRepositoriesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DockerHubRepository[];
}

export interface DockerHubTag {
  name: string;
  full_size: number;
  last_updated: string;
  last_updater_username: string;
  tag_status: string;
  digest: string;
}

export interface DockerHubTagsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DockerHubTag[];
}

/**
 * Fetch all Docker Hub repositories for the configured user.
 */
export async function fetchDockerHubRepositories(): Promise<DockerHubRepository[]> {
  const cacheKey = `dockerhub-repos:${GITHUB_USERNAME}`;
  const cached = getCached<DockerHubRepository[]>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const response = await registryFetch(
      `https://hub.docker.com/v2/repositories/${GITHUB_USERNAME}?page_size=100`,
      {
        headers: {
          'User-Agent': 'cr.dipak.io/1.0.0',
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Docker Hub repos:', response.status);
      if (cached) {
        console.warn('Serving stale cache for Docker Hub repos');
        return cached.data;
      }
      return [];
    }

    const data: DockerHubRepositoriesResponse = await response.json();
    const repos = data.results || [];
    setCache(cacheKey, repos);
    return repos;
  } catch (error) {
    console.error('Failed to fetch Docker Hub repos:', error);
    if (cached) {
      console.warn('Serving stale cache for Docker Hub repos');
      return cached.data;
    }
    return [];
  }
}

/**
 * Fetch tags for a specific Docker Hub repository.
 */
export async function fetchDockerHubTags(repoName: string): Promise<DockerHubTag[]> {
  const cacheKey = `dockerhub-tags:${GITHUB_USERNAME}/${repoName}`;
  const cached = getCached<DockerHubTag[]>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const response = await registryFetch(
      `https://hub.docker.com/v2/repositories/${GITHUB_USERNAME}/${repoName}/tags?page_size=100`,
      {
        headers: {
          'User-Agent': 'cr.dipak.io/1.0.0',
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Docker Hub tags:', response.status);
      if (cached) {
        console.warn('Serving stale cache for Docker Hub tags');
        return cached.data;
      }
      return [];
    }

    const data: DockerHubTagsResponse = await response.json();
    const tags = data.results || [];
    setCache(cacheKey, tags);
    return tags;
  } catch (error) {
    console.error('Failed to fetch Docker Hub tags:', error);
    if (cached) {
      console.warn('Serving stale cache for Docker Hub tags');
      return cached.data;
    }
    return [];
  }
}

// =============================================================================
// GHCR API - For listing packages (requires GITHUB_TOKEN with read:packages scope)
// =============================================================================

export interface GHCRPackage {
  id: number;
  name: string;
  package_type: string;
  visibility: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  } | null;
}

export interface GHCRPackageVersion {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: {
    package_type: string;
    container: {
      tags: string[];
    };
  };
}

/**
 * Fetch GHCR packages for the configured user.
 * Requires GITHUB_TOKEN env var with read:packages scope.
 */
export async function fetchGHCRPackages(): Promise<GHCRPackage[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN not set, skipping GHCR packages');
    return [];
  }

  const cacheKey = `ghcr-packages:${GITHUB_USERNAME}`;
  const cached = getCached<GHCRPackage[]>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const response = await registryFetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/packages?package_type=container&per_page=100`,
      {
        headers: {
          'User-Agent': 'cr.dipak.io/1.0.0',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch GHCR packages:', response.status);
      if (cached) {
        console.warn('Serving stale cache for GHCR packages');
        return cached.data;
      }
      return [];
    }

    const packages: GHCRPackage[] = await response.json();
    setCache(cacheKey, packages);
    return packages;
  } catch (error) {
    console.error('Failed to fetch GHCR packages:', error);
    if (cached) {
      console.warn('Serving stale cache for GHCR packages');
      return cached.data;
    }
    return [];
  }
}

/**
 * Fetch versions (tags) for a specific GHCR package.
 * Requires GITHUB_TOKEN env var with read:packages scope.
 */
export async function fetchGHCRPackageVersions(
  packageName: string
): Promise<GHCRPackageVersion[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN not set, skipping GHCR package versions');
    return [];
  }

  const cacheKey = `ghcr-versions:${GITHUB_USERNAME}/${packageName}`;
  const cached = getCached<GHCRPackageVersion[]>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  try {
    const response = await registryFetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/packages/container/${packageName}/versions?per_page=100`,
      {
        headers: {
          'User-Agent': 'cr.dipak.io/1.0.0',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch GHCR package versions:', response.status);
      if (cached) {
        console.warn('Serving stale cache for GHCR package versions');
        return cached.data;
      }
      return [];
    }

    const versions: GHCRPackageVersion[] = await response.json();
    setCache(cacheKey, versions);
    return versions;
  } catch (error) {
    console.error('Failed to fetch GHCR package versions:', error);
    if (cached) {
      console.warn('Serving stale cache for GHCR package versions');
      return cached.data;
    }
    return [];
  }
}
