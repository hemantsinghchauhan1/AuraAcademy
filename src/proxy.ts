import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes — Clerk will enforce authentication on these
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/quiz(.*)",
  "/result(.*)",
  "/leaderboard(.*)",
  "/forum(.*)",
]);

// Next.js 16 uses "proxy" export instead of "middleware"
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Redirects to /sign-in if not authenticated
  }
});

export const config = {
  matcher: [
    // Run middleware on all routes except static files and Next internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
