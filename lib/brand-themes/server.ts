import { defaultBrandThemeId, getBrandTheme } from "@/lib/brand-themes";
import type { AuthUser } from "@/lib/types";
import { getActiveEconomySettings } from "@/server/repositories/economy-settings-repository";

export async function resolveRuntimeBrandThemeId(user?: AuthUser | null) {
  void user;
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
