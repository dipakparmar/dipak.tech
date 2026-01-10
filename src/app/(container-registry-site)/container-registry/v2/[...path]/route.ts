import { NextRequest } from 'next/server';
import {
  parseRegistryPath,
  registryError,
  proxyManifest,
  headManifest,
  getBlobRedirect,
  listTags
} from '@/lib/container-registry';

/**
 * GET /v2/{registry}/{owner}/{image}/{endpoint}/{reference}
 * Handles all Docker Registry V2 API requests.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Parse the path to extract registry, image, endpoint, reference
  const parsed = parseRegistryPath(path);
  if (!parsed) {
    return registryError('NAME_INVALID', 'Invalid repository name or path', 400);
  }

  // Get authorization header from client
  const authHeader = request.headers.get('Authorization');
  const acceptHeader = request.headers.get('Accept');

  // Route based on endpoint type
  switch (parsed.endpoint) {
    case 'manifests':
      return proxyManifest(
        parsed.registry,
        parsed.imageName,
        parsed.reference,
        authHeader,
        acceptHeader
      );

    case 'blobs':
      return getBlobRedirect(
        parsed.registry,
        parsed.imageName,
        parsed.reference,
        authHeader
      );

    case 'tags':
      if (parsed.reference === 'list') {
        return listTags(parsed.registry, parsed.imageName, authHeader);
      }
      return registryError('UNSUPPORTED', 'Unsupported tags operation', 400);

    default:
      return registryError('UNSUPPORTED', 'Endpoint not supported', 400);
  }
}

/**
 * HEAD /v2/{registry}/{owner}/{image}/manifests/{reference}
 * Docker clients check manifest existence with HEAD first.
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  const parsed = parseRegistryPath(path);
  if (!parsed) {
    return registryError('NAME_INVALID', 'Invalid repository name or path', 400);
  }

  const authHeader = request.headers.get('Authorization');
  const acceptHeader = request.headers.get('Accept');

  // HEAD is only supported for manifests
  if (parsed.endpoint === 'manifests') {
    return headManifest(
      parsed.registry,
      parsed.imageName,
      parsed.reference,
      authHeader,
      acceptHeader
    );
  }

  // For blobs, do a redirect
  if (parsed.endpoint === 'blobs') {
    return getBlobRedirect(
      parsed.registry,
      parsed.imageName,
      parsed.reference,
      authHeader
    );
  }

  return registryError('UNSUPPORTED', 'HEAD not supported for this endpoint', 400);
}
