import { NextRequest, NextResponse } from "next/server";

import { brandThemeCookieName, resolveBrandThemeId } from "@/lib/brand-themes";

export function GET(request: NextRequest) {
  const theme = resolveBrandThemeId(request.nextUrl.searchParams.get("theme"));
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const destination = returnTo.startsWith("/") ? returnTo : "/";

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(brandThemeCookieName, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
