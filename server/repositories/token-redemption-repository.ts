import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AdminOverviewData, TokenSettlementItem } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type TokenSettlementRow = QueryResultRow & {
  id: string;
  asset: TokenSettlementItem["asset"];
  asset_name: string | null;
  reward_asset_id: string | null;
  reward_program_id: string | null;
  reward_program_name: string | null;
  token_amount: number | string;
  eligibility_points_spent: number | string;
  status: "claimed" | "settled";
  source: string;
  created_at: string;
  settled_at: string | null;
  receipt_reference: string | null;
  settlement_note: string | null;
  metadata: Record<string, string | number | boolean | null>;
  user_display_name: string;
  user_email: string | null;
  settled_by_display_name: string | null;
};

function mapTokenSettlement(row: TokenSettlementRow): TokenSettlementItem {
  return {
    id: row.id,
    userDisplayName: row.user_display_name,
    userEmail: row.user_email,
    asset: row.asset,
    assetName: row.asset_name,
    rewardAssetId: row.reward_asset_id,
    rewardProgramId: row.reward_program_id,
    rewardProgramName: row.reward_program_name,
    tokenAmount: Number(row.token_amount),
    eligibilityPointsSpent: Number(row.eligibility_points_spent),
    source: row.source,
    createdAt: row.created_at,
    settledAt: row.settled_at,
    receiptReference: row.receipt_reference,
    settlementNote: row.settlement_note,
    settledByDisplayName: row.settled_by_display_name,
    metadata: row.metadata ?? {},
  };
}

export async function listPendingTokenSettlements(limit = 20): Promise<TokenSettlementItem[]> {
  const result = await runQuery<TokenSettlementRow>(
    `SELECT redemptions.id, redemptions.asset, assets.name AS asset_name,
            redemptions.reward_asset_id, redemptions.reward_program_id,
            programs.name AS reward_program_name,
            redemptions.token_amount, redemptions.eligibility_points_spent,
            redemptions.status, redemptions.source, redemptions.created_at, redemptions.settled_at,
            redemptions.receipt_reference, redemptions.settlement_note, redemptions.metadata,
            users.display_name AS user_display_name, users.email AS user_email,
            settled_by_users.display_name AS settled_by_display_name
     FROM token_redemptions redemptions
     INNER JOIN users ON users.id = redemptions.user_id
     LEFT JOIN reward_assets assets ON assets.id = redemptions.reward_asset_id
     LEFT JOIN reward_programs programs ON programs.id = redemptions.reward_program_id
     LEFT JOIN users settled_by_users ON settled_by_users.id = redemptions.settled_by
     WHERE redemptions.status = 'claimed'
     ORDER BY redemptions.created_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapTokenSettlement);
}

export async function settleTokenRedemption({
  redemptionId,
  settledBy,
  receiptReference,
  settlementNote,
}: {
  redemptionId: string;
  settledBy: string;
  receiptReference: string;
  settlementNote: string | null;
}) {
  const result = await runQuery<TokenSettlementRow>(
    `UPDATE token_redemptions
     SET status = 'settled',
         settled_at = NOW(),
         settled_by = $2,
         receipt_reference = $3,
         settlement_note = $4
     WHERE id = $1
       AND status = 'claimed'
     RETURNING id, asset, NULL::text AS asset_name, token_amount, eligibility_points_spent, status, source, created_at, settled_at,
               receipt_reference, settlement_note, metadata, reward_asset_id, reward_program_id,
               NULL::text AS reward_program_name,
               ''::text AS user_display_name, NULL::text AS user_email, NULL::text AS settled_by_display_name`,
    [redemptionId, settledBy, receiptReference, settlementNote],
  );

  return Boolean(result.rows[0]);
}

export async function createClaimedTokenRedemption({
  userId,
  asset,
  rewardAssetId,
  rewardProgramId,
  tokenAmount,
  source,
  metadata,
}: {
  userId: string;
  asset: TokenSettlementItem["asset"];
  rewardAssetId?: string | null;
  rewardProgramId?: string | null;
  tokenAmount: number;
  source: string;
  metadata: Record<string, string | number | boolean | null>;
}) {
  await runQuery(
    `INSERT INTO token_redemptions (
       id, user_id, asset, reward_asset_id, reward_program_id, eligibility_points_spent, token_amount, status, source, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, 0, $6, 'claimed', $7, $8::jsonb
     )`,
    [randomUUID(), userId, asset, rewardAssetId ?? null, rewardProgramId ?? null, tokenAmount, source, JSON.stringify(metadata)],
  );
}

type SettlementAnalyticsRow = QueryResultRow & {
  pending_count: number | string;
  pending_token_amount: number | string;
  oldest_pending_hours: number | string | null;
  average_settlement_hours: number | string | null;
  settled_last_7_days_count: number | string;
  settled_last_7_days_token_amount: number | string;
  direct_reward_pending_count: number | string;
  direct_reward_settled_count: number | string;
  direct_reward_settled_token_amount: number | string;
};

type SettlementThroughputRow = QueryResultRow & {
  day_label: string;
  settled_count: number | string;
  settled_token_amount: number | string;
};

type SettlementByAssetRow = QueryResultRow & {
  asset: string;
  pending_count: number | string;
  settled_count: number | string;
  total_token_amount: number | string;
};

type SettlementByProgramRow = QueryResultRow & {
  reward_program_name: string;
  asset: string;
  pending_count: number | string;
  settled_count: number | string;
  total_token_amount: number | string;
};

export async function getTokenSettlementAnalytics(days = 7): Promise<AdminOverviewData["settlementAnalytics"]> {
  const safeDays = Math.min(Math.max(Math.round(days), 1), 90);
  const [summaryResult, throughputResult, byAssetResult, byProgramResult] = await Promise.all([
    runQuery<SettlementAnalyticsRow>(
      `WITH pending AS (
       SELECT
         COUNT(*)::int AS pending_count,
         COALESCE(SUM(token_amount), 0)::numeric AS pending_token_amount,
         COALESCE(EXTRACT(EPOCH FROM MAX(NOW() - created_at)) / 3600, 0)::numeric AS oldest_pending_hours
       FROM token_redemptions
       WHERE status = 'claimed'
     ),
     settled AS (
       SELECT
        COALESCE(AVG(EXTRACT(EPOCH FROM (settled_at - created_at)) / 3600), 0)::numeric AS average_settlement_hours,
        COUNT(*) FILTER (WHERE settled_at >= NOW() - ($1::int * INTERVAL '1 day'))::int AS settled_last_7_days_count,
        COALESCE(SUM(token_amount) FILTER (WHERE settled_at >= NOW() - ($1::int * INTERVAL '1 day')), 0)::numeric AS settled_last_7_days_token_amount
       FROM token_redemptions
       WHERE status = 'settled'
         AND settled_at IS NOT NULL
     ),
     direct_rewards AS (
       SELECT
         COUNT(*) FILTER (WHERE status = 'claimed' AND source = 'annual-referral-direct')::int AS direct_reward_pending_count,
         COUNT(*) FILTER (WHERE status = 'settled' AND source = 'annual-referral-direct')::int AS direct_reward_settled_count,
         COALESCE(SUM(token_amount) FILTER (WHERE status = 'settled' AND source = 'annual-referral-direct'), 0)::numeric AS direct_reward_settled_token_amount
       FROM token_redemptions
     )
     SELECT
       pending.pending_count,
       pending.pending_token_amount,
       pending.oldest_pending_hours,
       settled.average_settlement_hours,
       settled.settled_last_7_days_count,
       settled.settled_last_7_days_token_amount,
       direct_rewards.direct_reward_pending_count,
       direct_rewards.direct_reward_settled_count,
       direct_rewards.direct_reward_settled_token_amount
     FROM pending, settled, direct_rewards`,
      [safeDays],
    ),
    runQuery<SettlementThroughputRow>(
      `SELECT TO_CHAR(day_bucket.day, 'Mon DD') AS day_label,
              COALESCE(COUNT(redemptions.id), 0)::int AS settled_count,
              COALESCE(SUM(redemptions.token_amount), 0)::numeric AS settled_token_amount
       FROM (
         SELECT generate_series(
           date_trunc('day', NOW() - (($1::int - 1) * INTERVAL '1 day')),
           date_trunc('day', NOW()),
           INTERVAL '1 day'
         ) AS day
       ) AS day_bucket
       LEFT JOIN token_redemptions redemptions
         ON date_trunc('day', redemptions.settled_at) = day_bucket.day
        AND redemptions.status = 'settled'
       GROUP BY day_bucket.day
       ORDER BY day_bucket.day ASC`,
      [safeDays],
    ),
    runQuery<SettlementByAssetRow>(
      `SELECT redemptions.asset,
              COUNT(*) FILTER (WHERE redemptions.status = 'claimed')::int AS pending_count,
              COUNT(*) FILTER (WHERE redemptions.status = 'settled')::int AS settled_count,
              COALESCE(SUM(redemptions.token_amount), 0)::numeric AS total_token_amount
       FROM token_redemptions redemptions
       GROUP BY redemptions.asset
       ORDER BY total_token_amount DESC, redemptions.asset ASC`,
    ),
    runQuery<SettlementByProgramRow>(
      `SELECT COALESCE(programs.name, 'Unassigned program') AS reward_program_name,
              redemptions.asset,
              COUNT(*) FILTER (WHERE redemptions.status = 'claimed')::int AS pending_count,
              COUNT(*) FILTER (WHERE redemptions.status = 'settled')::int AS settled_count,
              COALESCE(SUM(redemptions.token_amount), 0)::numeric AS total_token_amount
       FROM token_redemptions redemptions
       LEFT JOIN reward_programs programs ON programs.id = redemptions.reward_program_id
       GROUP BY COALESCE(programs.name, 'Unassigned program'), redemptions.asset
       ORDER BY total_token_amount DESC, reward_program_name ASC`,
    ),
  ]);

  const row = summaryResult.rows[0];
  const settledLast7DaysCount = Number(row?.settled_last_7_days_count ?? 0);

  return {
    periodDays: safeDays,
    pendingCount: Number(row?.pending_count ?? 0),
    pendingTokenAmount: Number(row?.pending_token_amount ?? 0),
    oldestPendingHours: Number(row?.oldest_pending_hours ?? 0),
    averageSettlementHours: Number(row?.average_settlement_hours ?? 0),
    settledLast7DaysCount,
    settledLast7DaysTokenAmount: Number(row?.settled_last_7_days_token_amount ?? 0),
    directRewardPendingCount: Number(row?.direct_reward_pending_count ?? 0),
    directRewardSettledCount: Number(row?.direct_reward_settled_count ?? 0),
    directRewardSettledTokenAmount: Number(row?.direct_reward_settled_token_amount ?? 0),
    redemptionVelocityPerDay: Number((settledLast7DaysCount / safeDays).toFixed(2)),
    dailyThroughput: throughputResult.rows.map((entry) => ({
      label: entry.day_label,
      settledCount: Number(entry.settled_count),
      settledTokenAmount: Number(entry.settled_token_amount),
    })),
    byAsset: byAssetResult.rows.map((entry) => ({
      asset: entry.asset,
      pendingCount: Number(entry.pending_count),
      settledCount: Number(entry.settled_count),
      totalTokenAmount: Number(entry.total_token_amount),
    })),
    byProgram: byProgramResult.rows.map((entry) => ({
      rewardProgramName: entry.reward_program_name,
      asset: entry.asset,
      pendingCount: Number(entry.pending_count),
      settledCount: Number(entry.settled_count),
      totalTokenAmount: Number(entry.total_token_amount),
    })),
  };
}
