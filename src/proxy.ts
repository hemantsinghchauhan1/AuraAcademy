import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/quiz(.*)",
  "/result(.*)",
  "/leaderboard(.*)",
  "/forum(.*)",
]);

// Routes that should be accessible only to unauthenticated users
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/register(.*)",
]);

// Next.js 16 uses "proxy" file (this file) instead of "middleware"
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // If trying to access auth routes while already signed in → redirect to dashboard
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If trying to access protected routes while signed out → Clerk handles redirect to /sign-in
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
