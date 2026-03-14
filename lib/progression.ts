import { defaultEconomySettings, getXpTierMultiplier } from "./economy-settings.ts";
import type { SubscriptionTier } from "./types.ts";

export const levelThresholds = [
  0, 100, 280, 520, 900, 1500, 2350, 3400, 4700, 6500, 8000, 9800, 12000,
  14800, 18100, 22000, 26500, 32000, 39000, 47000, 60000, 72000, 86000,
  102000, 120000,
];

export function getLevelProgress(totalXp: number) {
  const matchedIndex = levelThresholds.findIndex((threshold, index) => {
    const next = levelThresholds[index + 1];
    return totalXp >= threshold && (next === undefined || totalXp < next);
  });
  const level = Math.max(1, matchedIndex + 1);

  const currentThreshold = levelThresholds[level - 1] ?? 0;
  const nextThreshold = levelThresholds[level] ?? levelThresholds[levelThresholds.length - 1];
  const progress = nextThreshold === currentThreshold
    ? 1
    : (totalXp - currentThreshold) / (nextThreshold - currentThreshold);

  return {
    level,
    currentThreshold,
    nextThreshold,
    progress,
    remainingXp: Math.max(nextThreshold - totalXp, 0),
  };
}

export function getTierMultiplier(tier: SubscriptionTier) {
  return getXpTierMultiplier(defaultEconomySettings, tier);
}

export function getTierLabel(tier: SubscriptionTier) {
  switch (tier) {
    case "annual":
      return "Annual Premium";
    case "monthly":
      return "Monthly Premium";
    default:
      return "Free";
  }
}
