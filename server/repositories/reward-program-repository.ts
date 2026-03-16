import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { RewardAsset, RewardProgram } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type RewardAssetRow = QueryResultRow & {
  id: string;
  asset_id: string;
  symbol: string;
  name: string;
  decimals: number | string;
  icon_url: string | null;
  issuer_name: string | null;
  is_active: boolean;
  is_partner_asset: boolean;
  created_at: string;
  updated_at: string;
};

type RewardProgramRow = QueryResultRow & {
  id: string;
  slug: string;
  name: string;
  reward_asset_id: string;
  asset_symbol: string;
  asset_name: string;
  is_active: boolean;
  redemption_enabled: boolean;
  direct_rewards_enabled: boolean;
  referral_rewards_enabled: boolean;
  premium_rewards_enabled: boolean;
  ambassador_rewards_enabled: boolean;
  minimum_eligibility_points: number | string;
  points_per_token: number | string;
  notes: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRewardAsset(row: RewardAssetRow): RewardAsset {
  return {
    id: row.id,
    assetId: row.asset_id,
    symbol: row.symbol,
    name: row.name,
    decimals: Number(row.decimals),
    iconUrl: row.icon_url,
    issuerName: row.issuer_name,
    isActive: row.is_active,
    isPartnerAsset: row.is_partner_asset,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRewardProgram(row: RewardProgramRow): RewardProgram {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    rewardAssetId: row.reward_asset_id,
    assetSymbol: row.asset_symbol,
    assetName: row.asset_name,
    isActive: row.is_active,
    redemptionEnabled: row.redemption_enabled,
    directRewardsEnabled: row.direct_rewards_enabled,
    referralRewardsEnabled: row.referral_rewards_enabled,
    premiumRewardsEnabled: row.premium_rewards_enabled,
    ambassadorRewardsEnabled: row.ambassador_rewards_enabled,
    minimumEligibilityPoints: Number(row.minimum_eligibility_points),
    pointsPerToken: Number(row.points_per_token),
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRewardAssets(): Promise<RewardAsset[]> {
  const result = await runQuery<RewardAssetRow>(
    `SELECT id, asset_id, symbol, name, decimals, icon_url, issuer_name, is_active, is_partner_asset, created_at, updated_at
     FROM reward_assets
     ORDER BY is_active DESC, is_partner_asset ASC, symbol ASC`,
  );

  return result.rows.map(mapRewardAsset);
}

export async function listRewardPrograms(): Promise<RewardProgram[]> {
  const result = await runQuery<RewardProgramRow>(
    `SELECT programs.id, programs.slug, programs.name, programs.reward_asset_id,
            assets.symbol AS asset_symbol, assets.name AS asset_name,
            programs.is_active, programs.redemption_enabled, programs.direct_rewards_enabled,
            programs.referral_rewards_enabled, programs.premium_rewards_enabled, programs.ambassador_rewards_enabled,
            programs.minimum_eligibility_points, programs.points_per_token, programs.notes,
            programs.starts_at, programs.ends_at, programs.created_at, programs.updated_at
     FROM reward_programs programs
     INNER JOIN reward_assets assets ON assets.id = programs.reward_asset_id
     ORDER BY programs.is_active DESC, programs.slug ASC`,
  );

  return result.rows.map(mapRewardProgram);
}

export async function findPreferredRewardProgramByAssetSymbol(assetSymbol: string): Promise<RewardProgram | null> {
  const result = await runQuery<RewardProgramRow>(
    `SELECT programs.id, programs.slug, programs.name, programs.reward_asset_id,
            assets.symbol AS asset_symbol, assets.name AS asset_name,
            programs.is_active, programs.redemption_enabled, programs.direct_rewards_enabled,
            programs.referral_rewards_enabled, programs.premium_rewards_enabled, programs.ambassador_rewards_enabled,
            programs.minimum_eligibility_points, programs.points_per_token, programs.notes,
            programs.starts_at, programs.ends_at, programs.created_at, programs.updated_at
     FROM reward_programs programs
     INNER JOIN reward_assets assets ON assets.id = programs.reward_asset_id
     WHERE assets.symbol = $1
       AND assets.is_active = TRUE
       AND programs.is_active = TRUE
     ORDER BY programs.redemption_enabled DESC, programs.direct_rewards_enabled DESC, programs.created_at ASC
     LIMIT 1`,
    [assetSymbol.trim().toUpperCase()],
  );

  return result.rows[0] ? mapRewardProgram(result.rows[0]) : null;
}

export async function createRewardAsset(input: Omit<RewardAsset, "id" | "createdAt" | "updatedAt">) {
  await runQuery(
    `INSERT INTO reward_assets (
       id, asset_id, symbol, name, decimals, icon_url, issuer_name, is_active, is_partner_asset
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      randomUUID(),
      input.assetId,
      input.symbol,
      input.name,
      input.decimals,
      input.iconUrl,
      input.issuerName,
      input.isActive,
      input.isPartnerAsset,
    ],
  );
}

export async function updateRewardAsset(
  assetId: string,
  input: Omit<RewardAsset, "id" | "createdAt" | "updatedAt">,
) {
  const result = await runQuery(
    `UPDATE reward_assets
     SET asset_id = $2,
         symbol = $3,
         name = $4,
         decimals = $5,
         icon_url = $6,
         issuer_name = $7,
         is_active = $8,
         is_partner_asset = $9,
         updated_at = NOW()
     WHERE id = $1`,
    [assetId, input.assetId, input.symbol, input.name, input.decimals, input.iconUrl, input.issuerName, input.isActive, input.isPartnerAsset],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createRewardProgram(input: Omit<RewardProgram, "id" | "assetSymbol" | "assetName" | "createdAt" | "updatedAt">) {
  await runQuery(
    `INSERT INTO reward_programs (
       id, slug, name, reward_asset_id, is_active, redemption_enabled, direct_rewards_enabled,
       referral_rewards_enabled, premium_rewards_enabled, ambassador_rewards_enabled,
       minimum_eligibility_points, points_per_token, notes, starts_at, ends_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
     )`,
    [
      randomUUID(),
      input.slug,
      input.name,
      input.rewardAssetId,
      input.isActive,
      input.redemptionEnabled,
      input.directRewardsEnabled,
      input.referralRewardsEnabled,
      input.premiumRewardsEnabled,
      input.ambassadorRewardsEnabled,
      input.minimumEligibilityPoints,
      input.pointsPerToken,
      input.notes,
      input.startsAt,
      input.endsAt,
    ],
  );
}

export async function updateRewardProgram(
  programId: string,
  input: Omit<RewardProgram, "id" | "assetSymbol" | "assetName" | "createdAt" | "updatedAt">,
) {
  const result = await runQuery(
    `UPDATE reward_programs
     SET slug = $2,
         name = $3,
         reward_asset_id = $4,
         is_active = $5,
         redemption_enabled = $6,
         direct_rewards_enabled = $7,
         referral_rewards_enabled = $8,
         premium_rewards_enabled = $9,
         ambassador_rewards_enabled = $10,
         minimum_eligibility_points = $11,
         points_per_token = $12,
         notes = $13,
         starts_at = $14,
         ends_at = $15,
         updated_at = NOW()
     WHERE id = $1`,
    [
      programId,
      input.slug,
      input.name,
      input.rewardAssetId,
      input.isActive,
      input.redemptionEnabled,
      input.directRewardsEnabled,
      input.referralRewardsEnabled,
      input.premiumRewardsEnabled,
      input.ambassadorRewardsEnabled,
      input.minimumEligibilityPoints,
      input.pointsPerToken,
      input.notes,
      input.startsAt,
      input.endsAt,
    ],
  );

  return (result.rowCount ?? 0) > 0;
}
