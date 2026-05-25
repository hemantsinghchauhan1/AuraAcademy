import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("student_session")?.value;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/quiz") ||
    pathname.startsWith("/result") ||
    pathname.startsWith("/leaderboard");

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !sessionToken) {
    const url = new URL("/login", request.url);
    // Keep track of the original page to redirect back after login
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/quiz/:path*",
    "/result/:path*",
    "/leaderboard/:path*",
    "/login",
    "/register",
  ],
};
