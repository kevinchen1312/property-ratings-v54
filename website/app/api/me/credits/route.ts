/**
 * GET /api/me/credits
 * Returns the current user's credit balance
 * Called by the mobile app after successful purchase
 */

import { NextResponse } from 'next/server';
import { getCurrentUser, getUserCredits } from '@/lib/supabaseServer';

export async function GET() {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Fetch user's credit balance
    const credits = await getUserCredits(user.id);

    return NextResponse.json({
      credits,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to fetch credits', details: errorMessage },
      { status: 500 }
    );
  }
}

// Enable CORS for mobile app
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

// Add CORS headers to response
export const dynamic = 'force-dynamic';

