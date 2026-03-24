import { cookies } from "next/headers";

import { defaultBrandThemeId, brandThemeCookieName, getBrandTheme } from "@/lib/brand-themes";
import type { AuthUser } from "@/lib/types";
import { isAdminUser } from "@/server/auth/admin";
import { resolveCurrentUser } from "@/server/auth/current-user";

export async function resolveRuntimeBrandThemeId(user?: AuthUser | null) {
  const currentUser = user === undefined ? await resolveCurrentUser() : user;
  const canUsePartnerThemes = await isAdminUser(currentUser);

  if (!canUsePartnerThemes) {
    return defaultBrandThemeId;
  }

  const cookieStore = await cookies();
  return cookieStore.get(brandThemeCookieName)?.value ?? defaultBrandThemeId;
}

export async function resolveRuntimeBrandTheme(user?: AuthUser | null) {
  return getBrandTheme(await resolveRuntimeBrandThemeId(user));
}
