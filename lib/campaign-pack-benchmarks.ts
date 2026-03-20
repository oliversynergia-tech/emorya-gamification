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
  retainedActivityRateTarget: number;
  averageWeeklyXpTarget: number;
  zeroCompletionWeekThreshold: number;
};

export const defaultCampaignPackBenchmarks: Record<CampaignSource | "direct", CampaignPackBenchmarkConfig> = {
  direct: {
    walletLinkRateTarget: 0.28,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.08,
    retainedActivityRateTarget: 0.32,
    averageWeeklyXpTarget: 180,
    zeroCompletionWeekThreshold: 1,
  },
  zealy: {
    walletLinkRateTarget: 0.35,
    rewardEligibilityRateTarget: 0.22,
    premiumConversionRateTarget: 0.1,
    retainedActivityRateTarget: 0.42,
    averageWeeklyXpTarget: 220,
    zeroCompletionWeekThreshold: 1,
  },
  galxe: {
    walletLinkRateTarget: 0.3,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.09,
    retainedActivityRateTarget: 0.35,
    averageWeeklyXpTarget: 200,
    zeroCompletionWeekThreshold: 1,
  },
  taskon: {
    walletLinkRateTarget: 0.32,
    rewardEligibilityRateTarget: 0.2,
    premiumConversionRateTarget: 0.1,
    retainedActivityRateTarget: 0.38,
    averageWeeklyXpTarget: 210,
    zeroCompletionWeekThreshold: 1,
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
      retainedActivityRateTarget: override.retainedActivityRateTarget,
      averageWeeklyXpTarget: override.averageWeeklyXpTarget,
      zeroCompletionWeekThreshold: override.zeroCompletionWeekThreshold,
    } satisfies CampaignPackBenchmark;
  }

  const benchmarks = settings.campaignPackBenchmarks ?? defaultCampaignPackBenchmarks;
  const selected = benchmarks[activeLane] ?? benchmarks.direct ?? defaultCampaignPackBenchmarks.direct;

  return {
    activeLane,
    ...selected,
  } satisfies CampaignPackBenchmark;
}
