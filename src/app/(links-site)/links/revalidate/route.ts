import { NextRequest, NextResponse } from 'next/server';

import { revalidatePath } from 'next/cache';

async function handleRevalidation(request: NextRequest) {
	console.log(`[Next.js] Webhook call received from ${request.headers.get('host')}`);

	console.log(`[Next.js] Validating webhook...`);
	
	// Get secret from query parameters or x-api-key header
	const searchParams = request.nextUrl.searchParams;
	const secretFromQuery = searchParams.get('secret');
	const secretFromHeader = request.headers.get('x-api-key');
	
	const secret = secretFromHeader || secretFromQuery;
	const webhookSecret = process.env.WEBHOOK_SECRET;
	
	// Check for secret to confirm this is a valid request
	if (secret && webhookSecret && secret === webhookSecret) {
		console.log(`[Next.js] Webhook secret validated`);
		
		try {
			console.log(`[Next.js] Revalidating path /links`);
			revalidatePath('/links');
			console.log(`[Next.js] Revalidated path /links`);
			
			return NextResponse.json({ revalidated: true });
		} catch (err) {
			// If there was an error, Next.js will continue
			// to show the last successfully generated page
			console.log(`[Next.js] Error revalidating path /links`);
			console.log(err);
			
			return NextResponse.json(
				{ message: 'Error revalidating', error: String(err) },
				{ status: 500 }
			);
		}
	}
	
	return NextResponse.json(
		{ message: 'Invalid token' },
		{ status: 401 }
	);
}

export async function GET(request: NextRequest) {
	return handleRevalidation(request);
}

export async function POST(request: NextRequest) {
	return handleRevalidation(request);
}
