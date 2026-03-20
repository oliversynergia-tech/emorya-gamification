import type {
  CampaignPackBenchmarkConfig,
  CampaignPackBenchmarkOverride,
  CampaignSource,
  EconomySettings,
} from "@/lib/types";

export type CampaignPackBenchmark = {
  activeLane: CampaignSource | "direct";
  walletLinkRateTarget: number;
  rewardEligibilityRateTarget: number;
  premiumConversionRateTarget: number;
  averageWeeklyXpTarget: number;
};

export const defaultCampaignPackBenchmarks: Record<CampaignSource | "direct", CampaignPackBenchmarkConfig> = {
  direct: {
    walletLinkRateTarget: 0.28,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.08,
    averageWeeklyXpTarget: 180,
  },
  zealy: {
    walletLinkRateTarget: 0.35,
    rewardEligibilityRateTarget: 0.22,
    premiumConversionRateTarget: 0.1,
    averageWeeklyXpTarget: 220,
  },
  galxe: {
    walletLinkRateTarget: 0.3,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.09,
    averageWeeklyXpTarget: 200,
  },
  taskon: {
    walletLinkRateTarget: 0.32,
    rewardEligibilityRateTarget: 0.2,
    premiumConversionRateTarget: 0.1,
    averageWeeklyXpTarget: 210,
  },
};

export function getCampaignPackBenchmark(
  settings: Pick<EconomySettings, "campaignPackBenchmarks">,
  activeLane: CampaignSource | "direct",
  override?: CampaignPackBenchmarkOverride | null,
) {
  if (override) {
    return {
      activeLane,
      walletLinkRateTarget: override.walletLinkRateTarget,
      rewardEligibilityRateTarget: override.rewardEligibilityRateTarget,
      premiumConversionRateTarget: override.premiumConversionRateTarget,
      averageWeeklyXpTarget: override.averageWeeklyXpTarget,
    } satisfies CampaignPackBenchmark;
  }

  const benchmarks = settings.campaignPackBenchmarks ?? defaultCampaignPackBenchmarks;
  const selected = benchmarks[activeLane] ?? benchmarks.direct ?? defaultCampaignPackBenchmarks.direct;

  return {
    activeLane,
    ...selected,
  } satisfies CampaignPackBenchmark;
}
