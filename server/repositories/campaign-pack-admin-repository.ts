import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { CampaignPackBenchmarkOverride } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type CampaignPackBenchmarkOverrideRow = QueryResultRow & {
  id: string;
  pack_id: string;
  label: string;
  wallet_link_rate_target: number | string;
  reward_eligibility_rate_target: number | string;
  premium_conversion_rate_target: number | string;
  retained_activity_rate_target: number | string;
  average_weekly_xp_target: number | string;
  zero_completion_week_threshold: number | string;
  reason: string | null;
  updated_at: string;
  updated_by_display_name: string | null;
};

function mapBenchmarkOverride(row: CampaignPackBenchmarkOverrideRow): CampaignPackBenchmarkOverride {
  return {
    packId: row.pack_id,
    label: row.label,
    walletLinkRateTarget: Number(row.wallet_link_rate_target),
    rewardEligibilityRateTarget: Number(row.reward_eligibility_rate_target),
    premiumConversionRateTarget: Number(row.premium_conversion_rate_target),
    retainedActivityRateTarget: Number(row.retained_activity_rate_target),
    averageWeeklyXpTarget: Number(row.average_weekly_xp_target),
    zeroCompletionWeekThreshold: Number(row.zero_completion_week_threshold),
    reason: row.reason,
    updatedAt: row.updated_at,
    updatedByDisplayName: row.updated_by_display_name,
  };
}

export async function listCampaignPackBenchmarkOverrides() {
  const result = await runQuery<CampaignPackBenchmarkOverrideRow>(
    `SELECT pack_override.id,
            pack_override.pack_id,
            pack_override.label,
            pack_override.wallet_link_rate_target,
            pack_override.reward_eligibility_rate_target,
            pack_override.premium_conversion_rate_target,
            pack_override.retained_activity_rate_target,
            pack_override.average_weekly_xp_target,
            pack_override.zero_completion_week_threshold,
            pack_override.reason,
            pack_override.updated_at,
            updater.display_name AS updated_by_display_name
     FROM campaign_pack_benchmark_overrides pack_override
     LEFT JOIN users updater ON updater.id = pack_override.updated_by
     ORDER BY pack_override.updated_at DESC, pack_override.label ASC`,
  );

  return result.rows.map(mapBenchmarkOverride);
}

export async function getCampaignPackBenchmarkOverrideByPackId(packId: string) {
  const result = await runQuery<CampaignPackBenchmarkOverrideRow>(
    `SELECT pack_override.id,
            pack_override.pack_id,
            pack_override.label,
            pack_override.wallet_link_rate_target,
            pack_override.reward_eligibility_rate_target,
            pack_override.premium_conversion_rate_target,
            pack_override.retained_activity_rate_target,
            pack_override.average_weekly_xp_target,
            pack_override.zero_completion_week_threshold,
            pack_override.reason,
            pack_override.updated_at,
            updater.display_name AS updated_by_display_name
     FROM campaign_pack_benchmark_overrides pack_override
     LEFT JOIN users updater ON updater.id = pack_override.updated_by
     WHERE pack_override.pack_id = $1
     LIMIT 1`,
    [packId],
  );

  return result.rows[0] ? mapBenchmarkOverride(result.rows[0]) : null;
}

export async function upsertCampaignPackBenchmarkOverride({
  packId,
  label,
  benchmark,
  reason,
  updatedBy,
}: {
  packId: string;
  label: string;
  benchmark: {
    walletLinkRateTarget: number;
    rewardEligibilityRateTarget: number;
    premiumConversionRateTarget: number;
    retainedActivityRateTarget: number;
    averageWeeklyXpTarget: number;
    zeroCompletionWeekThreshold: number;
  };
  reason?: string | null;
  updatedBy: string;
}) {
  await runQuery(
    `INSERT INTO campaign_pack_benchmark_overrides (
       id,
       pack_id,
       label,
       wallet_link_rate_target,
       reward_eligibility_rate_target,
       premium_conversion_rate_target,
       retained_activity_rate_target,
       average_weekly_xp_target,
       zero_completion_week_threshold,
       reason,
       created_by,
       updated_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11
     )
     ON CONFLICT (pack_id) DO UPDATE SET
       label = EXCLUDED.label,
       wallet_link_rate_target = EXCLUDED.wallet_link_rate_target,
       reward_eligibility_rate_target = EXCLUDED.reward_eligibility_rate_target,
       premium_conversion_rate_target = EXCLUDED.premium_conversion_rate_target,
       retained_activity_rate_target = EXCLUDED.retained_activity_rate_target,
       average_weekly_xp_target = EXCLUDED.average_weekly_xp_target,
       zero_completion_week_threshold = EXCLUDED.zero_completion_week_threshold,
       reason = EXCLUDED.reason,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [
      randomUUID(),
      packId,
      label,
      benchmark.walletLinkRateTarget,
      benchmark.rewardEligibilityRateTarget,
      benchmark.premiumConversionRateTarget,
      benchmark.retainedActivityRateTarget,
      benchmark.averageWeeklyXpTarget,
      benchmark.zeroCompletionWeekThreshold,
      reason?.trim() || null,
      updatedBy,
    ],
  );

  return listCampaignPackBenchmarkOverrides();
}

export async function clearCampaignPackBenchmarkOverride({
  packId,
}: {
  packId: string;
}) {
  await runQuery(
    `DELETE FROM campaign_pack_benchmark_overrides
     WHERE pack_id = $1`,
    [packId],
  );

  return listCampaignPackBenchmarkOverrides();
}
