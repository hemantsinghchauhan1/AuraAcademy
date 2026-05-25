import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/quiz(.*)",
  "/result(.*)",
  "/leaderboard(.*)",
  "/forum(.*)",
  "/admin(.*)",
]);

// Routes that should redirect signed-in users away to dashboard
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/register(.*)",
]);

// Next.js 16 uses "proxy" file (this file) instead of "middleware"
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Signed-in user visiting auth pages → send to dashboard
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated user visiting protected page → redirect to sign-in
  // Manual redirect used instead of auth.protect() for Next.js 16 compatibility
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    // Match everything except Next.js static assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
