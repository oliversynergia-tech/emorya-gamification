import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import { buildEconomySettingsSummary, defaultEconomySettings, normalizeTokenAsset } from "@/lib/economy-settings";
import type { EconomySettings, EconomySettingsAuditEntry } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type EconomySettingsRow = QueryResultRow & {
  id: string;
  payout_asset: string;
  redemption_enabled: boolean;
  direct_rewards_enabled: boolean;
  direct_annual_referral_enabled: boolean;
  direct_premium_flash_enabled: boolean;
  direct_ambassador_enabled: boolean;
  minimum_eligibility_points: number | string;
  points_per_token: number | string;
  xp_multiplier_free: number | string;
  xp_multiplier_monthly: number | string;
  xp_multiplier_annual: number | string;
  token_multiplier_free: number | string;
  token_multiplier_monthly: number | string;
  token_multiplier_annual: number | string;
  referral_signup_base_xp: number | string;
  referral_monthly_conversion_base_xp: number | string;
  referral_annual_conversion_base_xp: number | string;
  annual_referral_direct_token_amount: number | string;
  campaign_overrides: Record<string, {
    signupBonusXp?: number;
    monthlyConversionBonusXp?: number;
    annualConversionBonusXp?: number;
    annualDirectTokenBonus?: number;
  }>;
  updated_at: string;
};

type EconomyAuditRow = QueryResultRow & {
  id: string;
  created_at: string;
  changed_by_display_name: string | null;
  previous_config: Record<string, unknown>;
  next_config: Record<string, unknown>;
};

function mapEconomySettings(row: EconomySettingsRow): EconomySettings {
  return {
    id: row.id,
    payoutAsset: normalizeTokenAsset(row.payout_asset),
    redemptionEnabled: row.redemption_enabled,
    directRewardsEnabled: row.direct_rewards_enabled,
    directAnnualReferralEnabled: row.direct_annual_referral_enabled,
    directPremiumFlashEnabled: row.direct_premium_flash_enabled,
    directAmbassadorEnabled: row.direct_ambassador_enabled,
    minimumEligibilityPoints: Number(row.minimum_eligibility_points),
    pointsPerToken: Number(row.points_per_token),
    xpTierMultipliers: {
      free: Number(row.xp_multiplier_free),
      monthly: Number(row.xp_multiplier_monthly),
      annual: Number(row.xp_multiplier_annual),
    },
    tokenTierMultipliers: {
      free: Number(row.token_multiplier_free),
      monthly: Number(row.token_multiplier_monthly),
      annual: Number(row.token_multiplier_annual),
    },
    referralSignupBaseXp: Number(row.referral_signup_base_xp),
    referralMonthlyConversionBaseXp: Number(row.referral_monthly_conversion_base_xp),
    referralAnnualConversionBaseXp: Number(row.referral_annual_conversion_base_xp),
    annualReferralDirectTokenAmount: Number(row.annual_referral_direct_token_amount),
    campaignOverrides: {
      direct: {
        ...defaultEconomySettings.campaignOverrides.direct,
        ...(row.campaign_overrides?.direct ?? {}),
      },
      zealy: {
        ...defaultEconomySettings.campaignOverrides.zealy,
        ...(row.campaign_overrides?.zealy ?? {}),
      },
      galxe: {
        ...defaultEconomySettings.campaignOverrides.galxe,
        ...(row.campaign_overrides?.galxe ?? {}),
      },
      layer3: {
        ...defaultEconomySettings.campaignOverrides.layer3,
        ...(row.campaign_overrides?.layer3 ?? {}),
      },
    },
    updatedAt: row.updated_at,
  };
}

export async function getActiveEconomySettings() {
  const result = await runQuery<EconomySettingsRow>(
    `SELECT id, payout_asset, redemption_enabled, direct_rewards_enabled,
            direct_annual_referral_enabled, direct_premium_flash_enabled, direct_ambassador_enabled,
            minimum_eligibility_points, points_per_token,
            xp_multiplier_free, xp_multiplier_monthly, xp_multiplier_annual,
            token_multiplier_free, token_multiplier_monthly, token_multiplier_annual,
            referral_signup_base_xp, referral_monthly_conversion_base_xp,
            referral_annual_conversion_base_xp, annual_referral_direct_token_amount,
            campaign_overrides, updated_at
     FROM economy_settings
     WHERE is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  return result.rows[0] ? mapEconomySettings(result.rows[0]) : defaultEconomySettings;
}

export async function listEconomySettingsAudit(limit = 10): Promise<EconomySettingsAuditEntry[]> {
  const result = await runQuery<EconomyAuditRow>(
    `SELECT audit.id, audit.created_at, audit.previous_config, audit.next_config,
            users.display_name AS changed_by_display_name
     FROM economy_settings_audit audit
     LEFT JOIN users ON users.id = audit.changed_by
     ORDER BY audit.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    changedByDisplayName: row.changed_by_display_name,
    summary: buildEconomySettingsSummary(
      { ...defaultEconomySettings, ...(row.previous_config as Record<string, unknown>) } as EconomySettings,
      { ...defaultEconomySettings, ...(row.next_config as Record<string, unknown>) } as EconomySettings,
    ),
  }));
}

export async function updateActiveEconomySettings({
  changedBy,
  next,
}: {
  changedBy: string;
  next: Omit<EconomySettings, "id" | "updatedAt">;
}) {
  const current = await getActiveEconomySettings();
  const id = current.id === defaultEconomySettings.id ? randomUUID() : current.id;

  await runQuery(
    `INSERT INTO economy_settings (
       id, is_active, payout_asset, redemption_enabled, direct_rewards_enabled,
       direct_annual_referral_enabled, direct_premium_flash_enabled, direct_ambassador_enabled,
       minimum_eligibility_points, points_per_token,
       xp_multiplier_free, xp_multiplier_monthly, xp_multiplier_annual,
       token_multiplier_free, token_multiplier_monthly, token_multiplier_annual,
       referral_signup_base_xp, referral_monthly_conversion_base_xp,
       referral_annual_conversion_base_xp, annual_referral_direct_token_amount,
       campaign_overrides, updated_at
     ) VALUES (
       $1, TRUE, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       payout_asset = EXCLUDED.payout_asset,
       redemption_enabled = EXCLUDED.redemption_enabled,
       direct_rewards_enabled = EXCLUDED.direct_rewards_enabled,
       direct_annual_referral_enabled = EXCLUDED.direct_annual_referral_enabled,
       direct_premium_flash_enabled = EXCLUDED.direct_premium_flash_enabled,
       direct_ambassador_enabled = EXCLUDED.direct_ambassador_enabled,
       minimum_eligibility_points = EXCLUDED.minimum_eligibility_points,
       points_per_token = EXCLUDED.points_per_token,
       xp_multiplier_free = EXCLUDED.xp_multiplier_free,
       xp_multiplier_monthly = EXCLUDED.xp_multiplier_monthly,
       xp_multiplier_annual = EXCLUDED.xp_multiplier_annual,
       token_multiplier_free = EXCLUDED.token_multiplier_free,
       token_multiplier_monthly = EXCLUDED.token_multiplier_monthly,
       token_multiplier_annual = EXCLUDED.token_multiplier_annual,
       referral_signup_base_xp = EXCLUDED.referral_signup_base_xp,
       referral_monthly_conversion_base_xp = EXCLUDED.referral_monthly_conversion_base_xp,
       referral_annual_conversion_base_xp = EXCLUDED.referral_annual_conversion_base_xp,
       annual_referral_direct_token_amount = EXCLUDED.annual_referral_direct_token_amount,
       campaign_overrides = EXCLUDED.campaign_overrides,
       updated_at = NOW()`,
    [
      id,
      next.payoutAsset,
      next.redemptionEnabled,
      next.directRewardsEnabled,
      next.directAnnualReferralEnabled,
      next.directPremiumFlashEnabled,
      next.directAmbassadorEnabled,
      next.minimumEligibilityPoints,
      next.pointsPerToken,
      next.xpTierMultipliers.free,
      next.xpTierMultipliers.monthly,
      next.xpTierMultipliers.annual,
      next.tokenTierMultipliers.free,
      next.tokenTierMultipliers.monthly,
      next.tokenTierMultipliers.annual,
      next.referralSignupBaseXp,
      next.referralMonthlyConversionBaseXp,
      next.referralAnnualConversionBaseXp,
      next.annualReferralDirectTokenAmount,
      JSON.stringify(next.campaignOverrides),
    ],
  );

  const updated = await getActiveEconomySettings();

  await runQuery(
    `INSERT INTO economy_settings_audit (id, settings_id, changed_by, previous_config, next_config)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
    [
      randomUUID(),
      updated.id,
      changedBy,
      JSON.stringify(current),
      JSON.stringify(updated),
    ],
  );

  return updated;
}
