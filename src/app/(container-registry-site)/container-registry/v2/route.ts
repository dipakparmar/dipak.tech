import { NextResponse } from 'next/server';

/**
 * GET /v2/ - Docker Registry V2 API version check endpoint.
 * Must return 200 with Docker-Distribution-API-Version header.
 */
export async function GET() {
  return new NextResponse(JSON.stringify({}), {
    status: 200,
    headers: {
      'Docker-Distribution-API-Version': 'registry/2.0',
      'Content-Type': 'application/json'
    }
  });
}

/**
 * HEAD /v2/ - Also needed for some Docker clients.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Docker-Distribution-API-Version': 'registry/2.0'
    }
  });
}
