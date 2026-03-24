import { NextRequest, NextResponse } from "next/server";

import { resolveBrandThemeId } from "@/lib/brand-themes";
import { assertSuperAdminUser } from "@/server/auth/admin";
import { resolveCurrentUser } from "@/server/auth/current-user";
import { getActiveEconomySettings, updateActiveEconomySettings } from "@/server/repositories/economy-settings-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const theme = resolveBrandThemeId(request.nextUrl.searchParams.get("theme"));
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const destination = returnTo.startsWith("/") ? returnTo : "/";

  const response = NextResponse.redirect(new URL(destination, request.url));
  const currentUser = await resolveCurrentUser();

  try {
    await assertSuperAdminUser(currentUser);
  } catch {
    return response;
  }

  if (!currentUser) {
    return response;
  }

  const currentSettings = await getActiveEconomySettings();
  await updateActiveEconomySettings({
    changedBy: currentUser.id,
    next: {
      ...currentSettings,
      publishedBrandTheme: theme,
    },
  });

  return response;
}
