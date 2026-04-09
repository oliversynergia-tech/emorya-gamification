import { defaultBrandThemeId, resolveBrandThemeId, getBrandTheme } from "@/lib/brand-themes";
import type { AuthUser } from "@/lib/types";
import { getActiveEconomySettings } from "@/server/repositories/economy-settings-repository";

export async function resolveRuntimeBrandThemeId(user?: AuthUser | null) {
  void user;
  const forcedTheme = resolveBrandThemeId(process.env.BRAND_THEME ?? process.env.NEXT_PUBLIC_BRAND_THEME);
  if (forcedTheme !== defaultBrandThemeId || process.env.BRAND_THEME || process.env.NEXT_PUBLIC_BRAND_THEME) {
    return forcedTheme;
  }
  try {
    const settings = await getActiveEconomySettings();
    return settings.publishedBrandTheme ?? defaultBrandThemeId;
  } catch {
    return defaultBrandThemeId;
  }
}

export async function resolveRuntimeBrandTheme(user?: AuthUser | null) {
  return getBrandTheme(await resolveRuntimeBrandThemeId(user));
}
