import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { captureAPIError } from '@/lib/sentry-utils';

async function handleRevalidation(request: NextRequest) {
  console.log(
    `[Next.js] Webhook call received from ${request.headers.get('host')}`
  );

  console.log(`[Next.js] Validating webhook...`);

  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    return captureAPIError(
      new Error('WEBHOOK_SECRET not configured'),
      request,
      500,
      { operation: 'revalidate_links' }
    );
  }

  // Get secret from x-api-key header only (more secure than query params)
  const secretFromHeader = request.headers.get('x-api-key');

  // Use timing-safe comparison to prevent timing attacks
  if (secretFromHeader && secretFromHeader.length === webhookSecret.length) {
    let isValid = true;
    for (let i = 0; i < webhookSecret.length; i++) {
      if (secretFromHeader[i] !== webhookSecret[i]) {
        isValid = false;
      }
    }

    if (isValid) {
      console.log(`[Next.js] Webhook secret validated`);

      try {
        console.log(`[Next.js] Revalidating path /links`);
        revalidatePath('/links');
        console.log(`[Next.js] Revalidated path /links`);

        return NextResponse.json({ revalidated: true });
      } catch (err) {
        // If there was an error, Next.js will continue
        // to show the last successfully generated page
        return captureAPIError(err, request, 500, { operation: 'revalidate_links' });
      }
    }
  }

  return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  return handleRevalidation(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidation(request);
}
