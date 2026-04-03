import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type {
  CompletionStatus,
  QuestCompletionRecord,
  ReviewHistoryItem,
  SubscriptionTier,
  VerificationType,
} from "@/lib/types";
import { runQuery } from "@/server/db/client";

type UserQuestAccessRow = QueryResultRow & {
  id: string;
  display_name: string;
  level: number;
  subscription_tier: SubscriptionTier;
};

type QuestDefinitionRow = QueryResultRow & {
  id: string;
  title: string;
  xp_reward: number;
  verification_type: VerificationType;
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  required_level: number;
  required_tier: SubscriptionTier;
  metadata: Record<string, string | number | boolean | null>;
};

type QuestCompletionRow = QueryResultRow & {
  id: string;
  user_id: string;
  quest_id: string;
  status: CompletionStatus;
  submission_data: Record<string, string | number | boolean | null>;
  awarded_xp: number;
  reviewed_by: string | null;
  completed_at: string | null;
  created_at: string;
};

type ReviewQueueRow = QueryResultRow & {
  id: string;
  quest_id: string;
  quest_title: string;
  display_name: string;
  email: string | null;
  verification_type: VerificationType;
  submission_data: Record<string, string | number | boolean | null>;
  status: CompletionStatus;
  created_at: string;
};

type ReviewHistoryRow = QueryResultRow & {
  id: string;
  quest_id: string;
  quest_title: string;
  display_name: string;
  email: string | null;
  reviewer_display_name: string | null;
  verification_type: VerificationType;
  submission_data: Record<string, string | number | boolean | null>;
  status: Extract<CompletionStatus, "approved" | "rejected">;
  awarded_xp: number;
  reviewed_at: string;
};

type ReviewerWorkloadRow = QueryResultRow & {
  reviewer_display_name: string;
  review_count: string;
  approvals: string;
  rejections: string;
};

type ReviewVerificationBreakdownRow = QueryResultRow & {
  verification_type: VerificationType;
  pending_count: string;
  approved_count: string;
  rejected_count: string;
};

type ReviewerTypeMatrixRow = QueryResultRow & {
  reviewer_display_name: string;
  verification_type: VerificationType;
  review_count: string;
};

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  monthly: 1,
  annual: 2,
};

function mapQuestCompletion(row: QuestCompletionRow): QuestCompletionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    questId: row.quest_id,
    status: row.status,
    submissionData: row.submission_data,
    awardedXp: row.awarded_xp,
    reviewedBy: row.reviewed_by,
    completedAt: row.completed_at,
  };
}

export async function getUserQuestAccess(userId: string) {
  const result = await runQuery<UserQuestAccessRow>(
    `SELECT id, display_name, level, subscription_tier
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function getQuestDefinitionById(questId: string) {
  const result = await runQuery<QuestDefinitionRow>(
    `SELECT id, title, xp_reward, verification_type, recurrence, required_level, required_tier, metadata
     FROM quest_definitions
     WHERE id = $1 AND is_active = TRUE
     LIMIT 1`,
    [questId],
  );

  return result.rows[0] ?? null;
}

export async function getQuestDefinitionBySlug(slug: string) {
  const result = await runQuery<QuestDefinitionRow>(
    `SELECT id, title, xp_reward, verification_type, recurrence, required_level, required_tier, metadata
     FROM quest_definitions
     WHERE slug = $1 AND is_active = TRUE
     LIMIT 1`,
    [slug],
  );

  return result.rows[0] ?? null;
}

export async function getQuestCompletionForUser(userId: string, questId: string) {
  const result = await runQuery<QuestCompletionRow>(
    `SELECT id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at, created_at
     FROM quest_completions
     WHERE user_id = $1 AND quest_id = $2
     LIMIT 1`,
    [userId, questId],
  );

  return result.rows[0] ? mapQuestCompletion(result.rows[0]) : null;
}

export async function getQuestCompletionById(completionId: string) {
  const result = await runQuery<QuestCompletionRow>(
    `SELECT id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at, created_at
     FROM quest_completions
     WHERE id = $1
     LIMIT 1`,
    [completionId],
  );

  return result.rows[0] ? mapQuestCompletion(result.rows[0]) : null;
}

export async function upsertQuestCompletionForUser({
  userId,
  questId,
  status,
  submissionData,
  awardedXp,
  reviewedBy,
  completedAt,
}: {
  userId: string;
  questId: string;
  status: CompletionStatus;
  submissionData: Record<string, unknown>;
  awardedXp?: number;
  reviewedBy?: string | null;
  completedAt?: string | null;
}): Promise<QuestCompletionRecord> {
  const result = await runQuery<QuestCompletionRow>(
    `INSERT INTO quest_completions (id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     ON CONFLICT (user_id, quest_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       submission_data = EXCLUDED.submission_data,
       awarded_xp = EXCLUDED.awarded_xp,
       reviewed_by = EXCLUDED.reviewed_by,
       completed_at = EXCLUDED.completed_at
     RETURNING id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at`,
    [
      randomUUID(),
      userId,
      questId,
      status,
      JSON.stringify(submissionData),
      awardedXp ?? 0,
      reviewedBy ?? null,
      completedAt ?? null,
    ],
  );

  const row = result.rows[0];
  return mapQuestCompletion(row);
}

export async function updateQuestCompletionReview({
  completionId,
  reviewerId,
  status,
  submissionData,
}: {
  completionId: string;
  reviewerId: string | null;
  status: Extract<CompletionStatus, "approved" | "rejected">;
  submissionData?: Record<string, unknown>;
}) {
  const result = await runQuery<QuestCompletionRow>(
    `UPDATE quest_completions
     SET status = $2,
         reviewed_by = $3,
         submission_data = COALESCE($4::jsonb, submission_data),
         completed_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END
     WHERE id = $1
     RETURNING id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at, created_at`,
    [completionId, status, reviewerId, submissionData ? JSON.stringify(submissionData) : null],
  );

  return result.rows[0] ? mapQuestCompletion(result.rows[0]) : null;
}

export async function setQuestCompletionAwardedXp({
  completionId,
  awardedXp,
}: {
  completionId: string;
  awardedXp: number;
}) {
  const result = await runQuery<QuestCompletionRow>(
    `UPDATE quest_completions
     SET awarded_xp = $2
     WHERE id = $1
     RETURNING id, user_id, quest_id, status, submission_data, awarded_xp, reviewed_by, completed_at, created_at`,
    [completionId, awardedXp],
  );

  return result.rows[0] ? mapQuestCompletion(result.rows[0]) : null;
}

export async function getPendingReviewQueue() {
  const result = await runQuery<ReviewQueueRow>(
    `SELECT qc.id, qc.quest_id, q.title AS quest_title, u.display_name, u.email,
            q.verification_type, qc.submission_data, qc.status, qc.created_at
     FROM quest_completions qc
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     INNER JOIN users u ON u.id = qc.user_id
     WHERE qc.status = 'pending'
     ORDER BY qc.created_at ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    questId: row.quest_id,
    questTitle: row.quest_title,
    userDisplayName: row.display_name,
    userEmail: row.email,
    verificationType: row.verification_type,
    submissionData: row.submission_data,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getRecentReviewHistory(limit = 12): Promise<ReviewHistoryItem[]> {
  const result = await runQuery<ReviewHistoryRow>(
    `SELECT qc.id, qc.quest_id, q.title AS quest_title, u.display_name, u.email,
            reviewer.display_name AS reviewer_display_name,
            q.verification_type, qc.submission_data, qc.status, qc.awarded_xp,
            COALESCE(
              NULLIF(qc.submission_data->>'moderatedAt', '')::timestamptz,
              qc.completed_at,
              qc.created_at
            )::text AS reviewed_at
     FROM quest_completions qc
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     INNER JOIN users u ON u.id = qc.user_id
     LEFT JOIN users reviewer ON reviewer.id = qc.reviewed_by
     WHERE qc.status IN ('approved', 'rejected')
     ORDER BY COALESCE(
       NULLIF(qc.submission_data->>'moderatedAt', '')::timestamptz,
       qc.completed_at,
       qc.created_at
     ) DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    questId: row.quest_id,
    questTitle: row.quest_title,
    userDisplayName: row.display_name,
    userEmail: row.email,
    reviewerDisplayName: row.reviewer_display_name,
    verificationType: row.verification_type,
    submissionData: row.submission_data,
    status: row.status,
    awardedXp: row.awarded_xp,
    reviewedAt: row.reviewed_at,
  }));
}

export async function getReviewerWorkload(limit = 6) {
  const result = await runQuery<ReviewerWorkloadRow>(
    `SELECT reviewer.display_name AS reviewer_display_name,
            COUNT(qc.id)::text AS review_count,
            COUNT(*) FILTER (WHERE qc.status = 'approved')::text AS approvals,
            COUNT(*) FILTER (WHERE qc.status = 'rejected')::text AS rejections
     FROM quest_completions qc
     INNER JOIN users reviewer ON reviewer.id = qc.reviewed_by
     WHERE qc.status IN ('approved', 'rejected')
     GROUP BY reviewer.id, reviewer.display_name
     ORDER BY COUNT(qc.id) DESC, reviewer.display_name ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    reviewerDisplayName: row.reviewer_display_name,
    reviewCount: Number(row.review_count),
    approvals: Number(row.approvals),
    rejections: Number(row.rejections),
  }));
}

export async function getReviewBreakdownByVerificationType() {
  const result = await runQuery<ReviewVerificationBreakdownRow>(
    `SELECT q.verification_type,
            COUNT(*) FILTER (WHERE qc.status = 'pending')::text AS pending_count,
            COUNT(*) FILTER (WHERE qc.status = 'approved')::text AS approved_count,
            COUNT(*) FILTER (WHERE qc.status = 'rejected')::text AS rejected_count
     FROM quest_completions qc
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     GROUP BY q.verification_type
     ORDER BY q.verification_type ASC`,
  );

  return result.rows.map((row) => ({
    verificationType: row.verification_type,
    pendingCount: Number(row.pending_count),
    approvedCount: Number(row.approved_count),
    rejectedCount: Number(row.rejected_count),
  }));
}

export async function getReviewerTypeMatrix(limit = 10) {
  const result = await runQuery<ReviewerTypeMatrixRow>(
    `SELECT reviewer.display_name AS reviewer_display_name,
            q.verification_type,
            COUNT(*)::text AS review_count
     FROM quest_completions qc
     INNER JOIN users reviewer ON reviewer.id = qc.reviewed_by
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     WHERE qc.status IN ('approved', 'rejected')
     GROUP BY reviewer.id, reviewer.display_name, q.verification_type
     ORDER BY COUNT(*) DESC, reviewer.display_name ASC, q.verification_type ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    reviewerDisplayName: row.reviewer_display_name,
    verificationType: row.verification_type,
    reviewCount: Number(row.review_count),
  }));
}

export function userCanAccessQuest(
  user: Pick<UserQuestAccessRow, "level" | "subscription_tier">,
  quest: Pick<QuestDefinitionRow, "required_level" | "required_tier">,
) {
  return user.level >= quest.required_level && tierRank[user.subscription_tier] >= tierRank[quest.required_tier];
}
