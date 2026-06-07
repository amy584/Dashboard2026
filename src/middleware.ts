import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on every request and gates the app.
 * Unauthenticated users are sent to /sign-in; the onboarding/auth routes and
 * public assets stay open.
 */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/offline", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Skip if Supabase isn't configured yet (e.g. first local boot).
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on app routes only. Exclude static assets, the service worker/manifest,
  // and ALL /api routes — those handle their own auth (and webhooks/cron arrive
  // without a session cookie, so they must not be redirected to /sign-in).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|sw.js|manifest.webmanifest|api/).*)",
  ],
};
