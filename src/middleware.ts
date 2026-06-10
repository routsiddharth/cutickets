import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Paths that are reachable while logged out.
const PUBLIC_PATHS = ["/"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  // Forward the current pathname so server components (e.g. the app layout's
  // onboarding guard) can know where the request is headed.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", path);

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Note: we intentionally do NOT redirect logged-in users off "/" here. That
  // decision needs DB state (valid + onboarded), which isn't available at the
  // edge, and doing it here would loop banned/deleted users. The landing page
  // handles it server-side instead.
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  // Run on everything except Next internals, the auth API, the cron API (which
  // authenticates itself via CRON_SECRET — a session redirect here would stop
  // Vercel Cron from ever reaching it), and static assets.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
