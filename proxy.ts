import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/leaderboard",
  "/achievements",
  "/control-room-r7k9m2",
];

function isProtectedPath(pathname: string) {
  // Intentionally public routes:
  // - /
  // - /auth
  // - /faq
  // - /leaderboard/public
  // - /u/[code]
  // - /tips
  // - /api/og/[code]
  if (pathname === "/leaderboard/public" || pathname.startsWith("/leaderboard/public/")) {
    return false;
  }

  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.hash = "";

    return NextResponse.redirect(redirectUrl);
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth";
  redirectUrl.search = "";
  redirectUrl.hash = "";

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    // Intentionally public routes stay outside this matcher unless explicitly added later:
    // /, /auth, /faq, /leaderboard/public, /u/[code], /tips, /api/og/[code]
    "/dashboard/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/achievements/:path*",
    "/admin/:path*",
    "/control-room-r7k9m2/:path*",
  ],
};
