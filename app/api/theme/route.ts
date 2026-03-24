import { NextRequest, NextResponse } from "next/server";

import { brandThemeCookieName, resolveBrandThemeId } from "@/lib/brand-themes";
import { isAdminUser } from "@/server/auth/admin";
import { resolveCurrentUser } from "@/server/auth/current-user";

export async function GET(request: NextRequest) {
  const theme = resolveBrandThemeId(request.nextUrl.searchParams.get("theme"));
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const destination = returnTo.startsWith("/") ? returnTo : "/";

  const response = NextResponse.redirect(new URL(destination, request.url));
  const currentUser = await resolveCurrentUser();

  if (!(await isAdminUser(currentUser))) {
    return response;
  }

  response.cookies.set(brandThemeCookieName, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
