/**
 * Auth callback handler for Supabase PKCE flow
 * Handles OAuth redirects from Supabase Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/credits';

  if (code) {
    const cookieStore = request.cookies;
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Not used in this context but required by the interface
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to the page specified or default to /credits
  return NextResponse.redirect(new URL(next, request.url));
}

