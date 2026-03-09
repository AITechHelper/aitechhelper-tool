import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/get-started(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/subscribe",
  "/privacy",
  "/terms",
  "/api/stripe/webhook",
  "/api/instagram/callback",
  "/api/facebook/callback",
]);

// Routes that require subscription (protected app routes)
const isProtectedAppRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/generator(.*)",
  "/calendar(.*)",
  "/post(.*)",
  "/api/generate(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Development-only auth bypass - NEVER bypasses in production
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS_AUTH === "true"
  ) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Handle root route: unauthenticated → /get-started, authenticated → serve dashboard at /
  if (pathname === "/") {
    if (!userId) {
      return NextResponse.redirect(new URL("/get-started", req.url));
    }
    // Check subscription before serving dashboard
    const checkUrl = new URL("/api/check-subscription", req.url);
    try {
      const response = await fetch(checkUrl, {
        headers: { cookie: req.headers.get("cookie") || "" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "new" || data.status !== "active") {
          return NextResponse.redirect(new URL("/subscribe", req.url));
        }
      } else {
        return NextResponse.redirect(new URL("/subscribe", req.url));
      }
    } catch {
      // On error let through — dashboard will handle it
    }
    // Rewrite internally to /dashboard — URL stays as aisocialhelper.com
    return NextResponse.rewrite(new URL("/dashboard", req.url));
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If not logged in, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // For protected app routes, check subscription status
  if (isProtectedAppRoute(req)) {
    // Check subscription via API call to avoid direct DB access in edge middleware
    const checkUrl = new URL("/api/check-subscription", req.url);
    try {
      const response = await fetch(checkUrl, {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "new") {
          return NextResponse.redirect(new URL("/subscribe", req.url));
        }
        if (data.status !== "active") {
          return NextResponse.redirect(new URL("/subscribe", req.url));
        }
      } else {
        // If check fails, redirect to subscribe as fallback
        return NextResponse.redirect(new URL("/subscribe", req.url));
      }
    } catch {
      // On error, let the request through - page will handle auth
      // This prevents blocking if the API is temporarily unavailable
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
