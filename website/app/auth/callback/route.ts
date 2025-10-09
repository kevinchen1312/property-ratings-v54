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
    const response = NextResponse.redirect(new URL(next, request.url));
    
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Set cookies on the response object to ensure they're properly sent
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
    
    return response;
  }

  // Redirect to the page specified or default to /credits
  return NextResponse.redirect(new URL(next, request.url));
}

