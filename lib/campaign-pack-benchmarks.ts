import type { CampaignSource } from "@/lib/types";

export type CampaignPackBenchmark = {
  activeLane: CampaignSource | "direct";
  walletLinkRateTarget: number;
  rewardEligibilityRateTarget: number;
  premiumConversionRateTarget: number;
  averageWeeklyXpTarget: number;
};

const benchmarkMap: Record<CampaignSource | "direct", CampaignPackBenchmark> = {
  direct: {
    activeLane: "direct",
    walletLinkRateTarget: 0.28,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.08,
    averageWeeklyXpTarget: 180,
  },
  zealy: {
    activeLane: "zealy",
    walletLinkRateTarget: 0.35,
    rewardEligibilityRateTarget: 0.22,
    premiumConversionRateTarget: 0.1,
    averageWeeklyXpTarget: 220,
  },
  galxe: {
    activeLane: "galxe",
    walletLinkRateTarget: 0.3,
    rewardEligibilityRateTarget: 0.18,
    premiumConversionRateTarget: 0.09,
    averageWeeklyXpTarget: 200,
  },
  taskon: {
    activeLane: "taskon",
    walletLinkRateTarget: 0.32,
    rewardEligibilityRateTarget: 0.2,
    premiumConversionRateTarget: 0.1,
    averageWeeklyXpTarget: 210,
  },
};

export function getCampaignPackBenchmark(activeLane: CampaignSource | "direct") {
  return benchmarkMap[activeLane] ?? benchmarkMap.direct;
}

