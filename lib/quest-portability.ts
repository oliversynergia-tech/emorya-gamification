import type { BrandThemeId } from "@/lib/brand-themes";

export type QuestPortability = "core_portable" | "portable_adapt" | "emorya_only" | "campaign_conditional";

const supportedBrandThemes = ["emorya", "multiversx", "xportal"] as const satisfies BrandThemeId[];

export function parseQuestPortability(metadata: Record<string, unknown>) {
  const portability =
    metadata.questPortability === "portable_adapt" ||
    metadata.questPortability === "emorya_only" ||
    metadata.questPortability === "campaign_conditional"
      ? metadata.questPortability
      : "core_portable";

  const brandThemes = Array.isArray(metadata.brandThemes)
    ? metadata.brandThemes.filter((theme): theme is BrandThemeId =>
        typeof theme === "string" && (supportedBrandThemes as readonly string[]).includes(theme),
      )
    : [];

  return {
    portability: portability as QuestPortability,
    brandThemes,
  };
}

export function questVisibleForBrand(metadata: Record<string, unknown>, themeId: BrandThemeId) {
  const portability = parseQuestPortability(metadata);

  if (portability.brandThemes.length > 0) {
    return portability.brandThemes.includes(themeId);
  }

  if (portability.portability === "emorya_only") {
    return themeId === "emorya";
  }

  return true;
}
