import { emoryaTheme } from "./emorya.ts";
import { multiversxTheme } from "./multiversx.ts";
import { xportalTheme } from "./xportal.ts";
import type { BrandTheme, BrandThemeTokens } from "./types.ts";

export const brandThemes = {
  emorya: emoryaTheme,
  multiversx: multiversxTheme,
  xportal: xportalTheme,
} satisfies Record<string, BrandTheme>;

export type BrandThemeId = keyof typeof brandThemes;

export const defaultBrandThemeId: BrandThemeId = "emorya";
export const brandThemeCookieName = "brand-theme";

export function resolveBrandThemeId(candidate: string | null | undefined): BrandThemeId {
  if (!candidate) {
    return defaultBrandThemeId;
  }

  return candidate in brandThemes ? (candidate as BrandThemeId) : defaultBrandThemeId;
}

export function getBrandTheme(themeId: string | null | undefined): BrandTheme {
  return brandThemes[resolveBrandThemeId(themeId)];
}

export function getActiveBrandTheme(): BrandTheme {
  return getBrandTheme(process.env.NEXT_PUBLIC_BRAND_THEME ?? process.env.BRAND_THEME);
}

export function getBrandThemeStyleVariables(theme: BrandTheme): BrandThemeTokens {
  return theme.tokens;
}
