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
  workflow_state: TokenSettlementItem["workflowState"];
  source: string;
  created_at: string;
  approved_at: string | null;
  approved_by_display_name: string | null;
  processing_started_at: string | null;
  processing_by_display_name: string | null;
  held_at: string | null;
  held_by_display_name: string | null;
  hold_reason: string | null;
  failed_at: string | null;
  failed_by_display_name: string | null;
  last_error: string | null;
  cancelled_at: string | null;
  cancelled_by_display_name: string | null;
  cancellation_reason: string | null;
  retry_count: number | string;
  updated_at: string;
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
    workflowState: row.workflow_state,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    approvedByDisplayName: row.approved_by_display_name,
    processingStartedAt: row.processing_started_at,
    processingByDisplayName: row.processing_by_display_name,
    heldAt: row.held_at,
    heldByDisplayName: row.held_by_display_name,
    holdReason: row.hold_reason,
    failedAt: row.failed_at,
    failedByDisplayName: row.failed_by_display_name,
    lastError: row.last_error,
    cancelledAt: row.cancelled_at,
    cancelledByDisplayName: row.cancelled_by_display_name,
    cancellationReason: row.cancellation_reason,
    retryCount: Number(row.retry_count),
    updatedAt: row.updated_at,
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
            redemptions.status, redemptions.workflow_state, redemptions.source, redemptions.created_at,
            redemptions.approved_at, redemptions.processing_started_at, redemptions.held_at,
            redemptions.hold_reason, redemptions.failed_at, redemptions.last_error,
            redemptions.cancelled_at, redemptions.cancellation_reason, redemptions.retry_count, redemptions.updated_at,
            redemptions.settled_at, redemptions.receipt_reference, redemptions.settlement_note, redemptions.metadata,
            users.display_name AS user_display_name, users.email AS user_email,
            approved_by_users.display_name AS approved_by_display_name,
            processing_by_users.display_name AS processing_by_display_name,
            held_by_users.display_name AS held_by_display_name,
            failed_by_users.display_name AS failed_by_display_name,
            cancelled_by_users.display_name AS cancelled_by_display_name,
            settled_by_users.display_name AS settled_by_display_name
     FROM token_redemptions redemptions
     INNER JOIN users ON users.id = redemptions.user_id
     LEFT JOIN reward_assets assets ON assets.id = redemptions.reward_asset_id
     LEFT JOIN reward_programs programs ON programs.id = redemptions.reward_program_id
     LEFT JOIN users approved_by_users ON approved_by_users.id = redemptions.approved_by
     LEFT JOIN users processing_by_users ON processing_by_users.id = redemptions.processing_by
     LEFT JOIN users held_by_users ON held_by_users.id = redemptions.held_by
     LEFT JOIN users failed_by_users ON failed_by_users.id = redemptions.failed_by
     LEFT JOIN users cancelled_by_users ON cancelled_by_users.id = redemptions.cancelled_by
     LEFT JOIN users settled_by_users ON settled_by_users.id = redemptions.settled_by
     WHERE redemptions.status = 'claimed'
     ORDER BY redemptions.created_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapTokenSettlement);
}

export async function approveTokenRedemption({
  redemptionId,
  approvedBy,
}: {
  redemptionId: string;
  approvedBy: string;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'approved',
         approved_at = NOW(),
         approved_by = $2
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state = 'queued'
     RETURNING id`,
    [redemptionId, approvedBy],
  );

  return Boolean(result.rows[0]?.id);
}

export async function markTokenRedemptionProcessing({
  redemptionId,
  processingBy,
}: {
  redemptionId: string;
  processingBy: string;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'processing',
         processing_started_at = NOW(),
         processing_by = $2
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state IN ('approved', 'queued')
     RETURNING id`,
    [redemptionId, processingBy],
  );

  return Boolean(result.rows[0]?.id);
}

export async function holdTokenRedemption({
  redemptionId,
  heldBy,
  holdReason,
}: {
  redemptionId: string;
  heldBy: string;
  holdReason: string | null;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'held',
         held_at = NOW(),
         held_by = $2,
         hold_reason = $3,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state IN ('queued', 'approved', 'processing', 'failed')
     RETURNING id`,
    [redemptionId, heldBy, holdReason],
  );

  return Boolean(result.rows[0]?.id);
}

export async function failTokenRedemption({
  redemptionId,
  failedBy,
  lastError,
}: {
  redemptionId: string;
  failedBy: string;
  lastError: string | null;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'failed',
         failed_at = NOW(),
         failed_by = $2,
         last_error = $3,
         retry_count = retry_count + 1,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state IN ('approved', 'processing', 'held')
     RETURNING id`,
    [redemptionId, failedBy, lastError],
  );

  return Boolean(result.rows[0]?.id);
}

export async function requeueTokenRedemption({
  redemptionId,
}: {
  redemptionId: string;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'queued',
         approved_at = NULL,
         approved_by = NULL,
         processing_started_at = NULL,
         processing_by = NULL,
         held_at = NULL,
         held_by = NULL,
         hold_reason = NULL,
         failed_at = NULL,
         failed_by = NULL,
         last_error = NULL,
         cancelled_at = NULL,
         cancelled_by = NULL,
         cancellation_reason = NULL,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state IN ('held', 'failed', 'cancelled')
     RETURNING id`,
    [redemptionId],
  );

  return Boolean(result.rows[0]?.id);
}

export async function cancelTokenRedemption({
  redemptionId,
  cancelledBy,
  cancellationReason,
}: {
  redemptionId: string;
  cancelledBy: string;
  cancellationReason: string | null;
}) {
  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET workflow_state = 'cancelled',
         cancelled_at = NOW(),
         cancelled_by = $2,
         cancellation_reason = $3,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'claimed'
       AND workflow_state <> 'settled'
     RETURNING id`,
    [redemptionId, cancelledBy, cancellationReason],
  );

  return Boolean(result.rows[0]?.id);
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
         workflow_state = 'settled',
         settled_at = NOW(),
         settled_by = $2,
         receipt_reference = $3,
         settlement_note = $4
     WHERE id = $1
       AND status = 'claimed'
     RETURNING id, asset, NULL::text AS asset_name, token_amount, eligibility_points_spent, status, workflow_state, source, created_at,
               approved_at, NULL::text AS approved_by_display_name, processing_started_at, NULL::text AS processing_by_display_name, settled_at,
               receipt_reference, settlement_note, metadata, reward_asset_id, reward_program_id,
               NULL::text AS reward_program_name,
               ''::text AS user_display_name, NULL::text AS user_email, NULL::text AS settled_by_display_name`,
    [redemptionId, settledBy, receiptReference, settlementNote],
  );

  return Boolean(result.rows[0]);
}

export async function updateTokenRedemptionAutomationMetadata({
  redemptionId,
  automationReceiptReference,
  automationSettlementNote,
  generatedBy,
}: {
  redemptionId: string;
  automationReceiptReference?: string | null;
  automationSettlementNote?: string | null;
  generatedBy?: string | null;
}) {
  if (automationReceiptReference === undefined && automationSettlementNote === undefined) {
    return false;
  }

  const values: Array<string | null> = [redemptionId];
  let metadataExpression = "COALESCE(metadata, '{}'::jsonb)";
  let position = 2;

  if (automationReceiptReference !== undefined) {
    metadataExpression = `jsonb_set(${metadataExpression}, '{automationReceiptReference}', to_jsonb($${position}::text), true)`;
    values.push(automationReceiptReference);
    position += 1;
  }

  if (automationSettlementNote !== undefined) {
    metadataExpression = `jsonb_set(${metadataExpression}, '{automationSettlementNote}', to_jsonb($${position}::text), true)`;
    values.push(automationSettlementNote);
    position += 1;
  }

  if (generatedBy !== undefined) {
    metadataExpression = `jsonb_set(${metadataExpression}, '{automationReceiptGeneratedBy}', to_jsonb($${position}::text), true)`;
    values.push(generatedBy);
    position += 1;
  }

  const result = await runQuery<{ id: string }>(
    `UPDATE token_redemptions
     SET metadata = ${metadataExpression},
         updated_at = NOW()
     WHERE id = $1
       AND status = 'claimed'
     RETURNING id`,
    values,
  );

  return Boolean(result.rows[0]?.id);
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

export async function createTokenRedemptionAudit({
  redemptionId,
  action,
  changedBy,
  previousWorkflowState,
  nextWorkflowState,
  receiptReference,
  settlementNote,
  metadata,
}: {
  redemptionId: string;
  action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
  changedBy: string;
  previousWorkflowState: TokenSettlementItem["workflowState"];
  nextWorkflowState: TokenSettlementItem["workflowState"];
  receiptReference?: string | null;
  settlementNote?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await runQuery(
    `INSERT INTO token_redemption_audit (
       id, redemption_id, action, changed_by, previous_workflow_state, next_workflow_state,
       receipt_reference, settlement_note, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb
     )`,
    [
      randomUUID(),
      redemptionId,
      action,
      changedBy,
      previousWorkflowState,
      nextWorkflowState,
      receiptReference ?? null,
      settlementNote ?? null,
      JSON.stringify(metadata ?? {}),
    ],
  );
}

export async function listRecentTokenRedemptionAudit(limit = 12) {
  const result = await runQuery<TokenRedemptionAuditRow>(
    `SELECT audit.id, audit.redemption_id, audit.action, audit.previous_workflow_state, audit.next_workflow_state,
            users.display_name AS changed_by_display_name, audit.receipt_reference, audit.settlement_note,
            audit.created_at, audit.metadata
     FROM token_redemption_audit audit
     LEFT JOIN users ON users.id = audit.changed_by
     ORDER BY audit.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    redemptionId: row.redemption_id,
    action: row.action,
    previousWorkflowState: row.previous_workflow_state,
    nextWorkflowState: row.next_workflow_state,
    changedByDisplayName: row.changed_by_display_name,
    receiptReference: row.receipt_reference,
    settlementNote: row.settlement_note,
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  }));
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
  previous_settled_count: number | string;
  previous_settled_token_amount: number | string;
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

type SettlementWorkflowRow = QueryResultRow & {
  workflow_state: TokenSettlementItem["workflowState"];
  count: number | string;
};

type SettlementFailureReasonRow = QueryResultRow & {
  reason: string | null;
  count: number | string;
};

type SettlementExceptionTrendRow = QueryResultRow & {
  state: "held" | "failed" | "cancelled";
  current_count: number | string;
  previous_count: number | string;
};

type TokenRedemptionAuditRow = QueryResultRow & {
  id: string;
  redemption_id: string;
  action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
  previous_workflow_state: TokenSettlementItem["workflowState"];
  next_workflow_state: TokenSettlementItem["workflowState"];
  changed_by_display_name: string | null;
  receipt_reference: string | null;
  settlement_note: string | null;
  created_at: string;
  metadata: Record<string, string | number | boolean | null>;
};

export async function getTokenSettlementAnalytics(input?: {
  days?: number;
  compareDays?: number;
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
}): Promise<AdminOverviewData["settlementAnalytics"]> {
  const safeDays = Math.min(Math.max(Math.round(input?.days ?? 7), 1), 365);
  const safeCompareDays = Math.min(Math.max(Math.round(input?.compareDays ?? input?.days ?? 7), 1), 365);
  const customStartDate = input?.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null;
  const customEndDate = input?.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null;
  const hasCustomRange =
    customStartDate instanceof Date &&
    customEndDate instanceof Date &&
    Number.isFinite(customStartDate.getTime()) &&
    Number.isFinite(customEndDate.getTime()) &&
    customEndDate.getTime() >= customStartDate.getTime();
  const currentRangeStart = hasCustomRange
    ? customStartDate
    : new Date(Date.now() - (safeDays - 1) * 24 * 60 * 60 * 1000);
  currentRangeStart.setUTCHours(0, 0, 0, 0);
  const currentRangeEndExclusive = hasCustomRange ? new Date(customEndDate.getTime() + 24 * 60 * 60 * 1000) : new Date();
  currentRangeEndExclusive.setUTCHours(0, 0, 0, 0);
  if (!hasCustomRange) {
    currentRangeEndExclusive.setUTCDate(currentRangeEndExclusive.getUTCDate() + 1);
  }

  const currentRangeDays = Math.max(
    Math.round((currentRangeEndExclusive.getTime() - currentRangeStart.getTime()) / (24 * 60 * 60 * 1000)),
    1,
  );
  const compareCustomStartDate = input?.compareStartDate ? new Date(`${input.compareStartDate}T00:00:00.000Z`) : null;
  const compareCustomEndDate = input?.compareEndDate ? new Date(`${input.compareEndDate}T00:00:00.000Z`) : null;
  const hasCustomCompareRange =
    compareCustomStartDate instanceof Date &&
    compareCustomEndDate instanceof Date &&
    Number.isFinite(compareCustomStartDate.getTime()) &&
    Number.isFinite(compareCustomEndDate.getTime()) &&
    compareCustomEndDate.getTime() >= compareCustomStartDate.getTime();
  const compareRangeStart = hasCustomCompareRange
    ? compareCustomStartDate
    : new Date(currentRangeStart.getTime() - (hasCustomRange ? currentRangeDays : safeCompareDays) * 24 * 60 * 60 * 1000);
  compareRangeStart.setUTCHours(0, 0, 0, 0);
  const compareRangeEndExclusive = hasCustomCompareRange
    ? new Date(compareCustomEndDate.getTime() + 24 * 60 * 60 * 1000)
    : new Date(currentRangeStart);
  compareRangeEndExclusive.setUTCHours(0, 0, 0, 0);
  const compareRangeDays = Math.max(
    Math.round((compareRangeEndExclusive.getTime() - compareRangeStart.getTime()) / (24 * 60 * 60 * 1000)),
    1,
  );
  const [summaryResult, throughputResult, byAssetResult, byProgramResult, workflowResult, failureReasonResult, exceptionTrendResult] = await Promise.all([
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
        COUNT(*) FILTER (WHERE settled_at >= $1::timestamptz AND settled_at < $2::timestamptz)::int AS settled_last_7_days_count,
        COALESCE(SUM(token_amount) FILTER (WHERE settled_at >= $1::timestamptz AND settled_at < $2::timestamptz), 0)::numeric AS settled_last_7_days_token_amount
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
     ),
     previous_period AS (
       SELECT
        COUNT(*) FILTER (
          WHERE settled_at >= $3::timestamptz
            AND settled_at < $4::timestamptz
        )::int AS previous_settled_count,
        COALESCE(SUM(token_amount) FILTER (
          WHERE settled_at >= $3::timestamptz
            AND settled_at < $4::timestamptz
        ), 0)::numeric AS previous_settled_token_amount
       FROM token_redemptions
       WHERE status = 'settled'
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
       direct_rewards.direct_reward_settled_token_amount,
       previous_period.previous_settled_count,
       previous_period.previous_settled_token_amount
     FROM pending, settled, direct_rewards, previous_period`,
      [currentRangeStart, currentRangeEndExclusive, compareRangeStart, compareRangeEndExclusive],
    ),
    runQuery<SettlementThroughputRow>(
      `SELECT TO_CHAR(day_bucket.day, 'Mon DD') AS day_label,
              COALESCE(COUNT(redemptions.id), 0)::int AS settled_count,
              COALESCE(SUM(redemptions.token_amount), 0)::numeric AS settled_token_amount
       FROM (
         SELECT generate_series(
           $1::timestamptz,
           $2::timestamptz - INTERVAL '1 day',
           INTERVAL '1 day'
         ) AS day
       ) AS day_bucket
       LEFT JOIN token_redemptions redemptions
         ON date_trunc('day', redemptions.settled_at) = day_bucket.day
        AND redemptions.status = 'settled'
       GROUP BY day_bucket.day
       ORDER BY day_bucket.day ASC`,
      [currentRangeStart, currentRangeEndExclusive],
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
    runQuery<SettlementWorkflowRow>(
      `SELECT workflow_state, COUNT(*)::int AS count
       FROM token_redemptions
       WHERE status = 'claimed' OR workflow_state = 'settled'
       GROUP BY workflow_state
       ORDER BY workflow_state ASC`,
    ),
    runQuery<SettlementFailureReasonRow>(
      `SELECT COALESCE(NULLIF(last_error, ''), 'Unknown failure') AS reason, COUNT(*)::int AS count
       FROM token_redemptions
       WHERE workflow_state = 'failed'
         AND status = 'claimed'
       GROUP BY COALESCE(NULLIF(last_error, ''), 'Unknown failure')
       ORDER BY COUNT(*) DESC, reason ASC
       LIMIT 5`,
    ),
    runQuery<SettlementExceptionTrendRow>(
      `WITH exception_events AS (
         SELECT 'held'::text AS state, held_at AS state_at
         FROM token_redemptions
         WHERE held_at IS NOT NULL
         UNION ALL
         SELECT 'failed'::text AS state, failed_at AS state_at
         FROM token_redemptions
         WHERE failed_at IS NOT NULL
         UNION ALL
         SELECT 'cancelled'::text AS state, cancelled_at AS state_at
         FROM token_redemptions
         WHERE cancelled_at IS NOT NULL
       )
       SELECT state,
              COUNT(*) FILTER (WHERE state_at >= $1::timestamptz AND state_at < $2::timestamptz)::int AS current_count,
              COUNT(*) FILTER (WHERE state_at >= $3::timestamptz AND state_at < $4::timestamptz)::int AS previous_count
       FROM exception_events
       GROUP BY state
       ORDER BY state ASC`,
      [currentRangeStart, currentRangeEndExclusive, compareRangeStart, compareRangeEndExclusive],
    ),
  ]);

  const row = summaryResult.rows[0];
  const settledLast7DaysCount = Number(row?.settled_last_7_days_count ?? 0);
  const previousSettledCount = Number(row?.previous_settled_count ?? 0);
  const previousSettledTokenAmount = Number(row?.previous_settled_token_amount ?? 0);
  const currentVelocity = Number((settledLast7DaysCount / currentRangeDays).toFixed(2));
  const previousVelocity = Number((previousSettledCount / compareRangeDays).toFixed(2));

  return {
    periodDays: currentRangeDays,
    comparePeriodDays: compareRangeDays,
    periodLabel: hasCustomRange
      ? `${input?.startDate} to ${input?.endDate}`
      : `Last ${safeDays} days`,
    comparePeriodLabel: hasCustomCompareRange
      ? `${input?.compareStartDate} to ${input?.compareEndDate}`
      : `Previous ${hasCustomRange ? currentRangeDays : safeCompareDays} days`,
    pendingCount: Number(row?.pending_count ?? 0),
    pendingTokenAmount: Number(row?.pending_token_amount ?? 0),
    oldestPendingHours: Number(row?.oldest_pending_hours ?? 0),
    averageSettlementHours: Number(row?.average_settlement_hours ?? 0),
    settledLast7DaysCount,
    settledLast7DaysTokenAmount: Number(row?.settled_last_7_days_token_amount ?? 0),
    previousSettledCount,
    previousSettledTokenAmount,
    previousRedemptionVelocityPerDay: previousVelocity,
    settledCountDelta: settledLast7DaysCount - previousSettledCount,
    settledTokenAmountDelta: Number(row?.settled_last_7_days_token_amount ?? 0) - previousSettledTokenAmount,
    velocityDelta: Number((currentVelocity - previousVelocity).toFixed(2)),
    directRewardPendingCount: Number(row?.direct_reward_pending_count ?? 0),
    directRewardSettledCount: Number(row?.direct_reward_settled_count ?? 0),
    directRewardSettledTokenAmount: Number(row?.direct_reward_settled_token_amount ?? 0),
    redemptionVelocityPerDay: currentVelocity,
    workflowBreakdown: workflowResult.rows.map((entry) => ({
      state: entry.workflow_state,
      count: Number(entry.count),
    })),
    exceptionBreakdown: workflowResult.rows
      .filter((entry) => entry.workflow_state === "held" || entry.workflow_state === "failed" || entry.workflow_state === "cancelled")
      .map((entry) => ({
        state: entry.workflow_state as "held" | "failed" | "cancelled",
        count: Number(entry.count),
      })),
    exceptionTrend: exceptionTrendResult.rows.map((entry) => ({
      state: entry.state,
      currentCount: Number(entry.current_count),
      previousCount: Number(entry.previous_count),
      delta: Number(entry.current_count) - Number(entry.previous_count),
    })),
    topFailureReasons: failureReasonResult.rows.map((entry) => ({
      reason: entry.reason ?? "Unknown failure",
      count: Number(entry.count),
    })),
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
