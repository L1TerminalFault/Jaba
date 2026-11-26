import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Routes accessible without authentication.
 * All other routes require an active Clerk session via `auth.protect()`.
 */
function isPublicRoute(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/intro" ||
    pathname.startsWith("/intro/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return true;
  }

  // Always allow Clerk's internal auto-proxy and hosted/custom auth callbacks
  if (
    pathname.startsWith("/__clerk") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  ) {
    return true;
  }

  return false;
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request.nextUrl.pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
