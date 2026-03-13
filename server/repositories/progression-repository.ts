import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { SubscriptionTier } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type UserProgressRow = QueryResultRow & {
  id: string;
  display_name: string;
  attribution_source: string | null;
  subscription_tier: SubscriptionTier;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
};

export async function getUserProgressById(userId: string) {
  const result = await runQuery<UserProgressRow>(
    `SELECT id, display_name, attribution_source, subscription_tier, total_xp, level, current_streak, longest_streak
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function updateUserProgressById({
  userId,
  totalXp,
  level,
  currentStreak,
  longestStreak,
}: {
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
}) {
  const result = await runQuery<UserProgressRow>(
    `UPDATE users
     SET total_xp = $2,
         level = $3,
         current_streak = $4,
         longest_streak = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, display_name, attribution_source, subscription_tier, total_xp, level, current_streak, longest_streak`,
    [userId, totalXp, level, currentStreak, longestStreak],
  );

  return result.rows[0] ?? null;
}

export async function hasQuestApprovalActivityToday(userId: string) {
  const result = await runQuery<{ found: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM activity_log
       WHERE user_id = $1
         AND action_type = 'quest-approved'
         AND created_at >= DATE_TRUNC('day', NOW())
     ) AS found`,
    [userId],
  );

  return Boolean(result.rows[0]?.found);
}

export async function createActivityLogEntry({
  userId,
  actionType,
  xpEarned,
  metadata,
}: {
  userId: string;
  actionType: string;
  xpEarned: number;
  metadata: Record<string, string | number | boolean | null>;
}) {
  await runQuery(
    `INSERT INTO activity_log (id, user_id, action_type, xp_earned, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), userId, actionType, xpEarned, JSON.stringify(metadata)],
  );
}
