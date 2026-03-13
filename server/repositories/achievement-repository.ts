import type { QueryResultRow } from "pg";

import { runQuery } from "@/server/db/client";

type AchievementDefinitionRow = QueryResultRow & {
  id: string;
  slug: string;
  condition: Record<string, string | number | boolean | null>;
};

type UserAchievementRow = QueryResultRow & {
  progress: number | string;
  earned_at: string | null;
};

type AchievementProgressContextRow = QueryResultRow & {
  approved_quest_count: string;
  invited_count: string;
  converted_count: string;
  linked_wallet_count: string;
  approved_manual_review_count: string;
  approved_daily_quest_count: string;
};

export async function getAchievementDefinitions() {
  const result = await runQuery<AchievementDefinitionRow>(
    `SELECT id, slug, condition
     FROM achievements`,
  );

  return result.rows;
}

export async function getUserAchievementsByUserId(userId: string) {
  const result = await runQuery<UserAchievementRow & { slug: string }>(
    `SELECT a.slug, ua.progress, ua.earned_at
     FROM user_achievements ua
     INNER JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1`,
    [userId],
  );

  return new Map(
    result.rows.map((row) => [
      row.slug,
      {
        progress: Number(row.progress),
        earnedAt: row.earned_at,
      },
    ]),
  );
}

export async function upsertUserAchievement({
  userId,
  achievementId,
  progress,
  earnedAt,
}: {
  userId: string;
  achievementId: string;
  progress: number;
  earnedAt: string | null;
}) {
  await runQuery(
    `INSERT INTO user_achievements (user_id, achievement_id, progress, earned_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, achievement_id)
     DO UPDATE SET
       progress = EXCLUDED.progress,
       earned_at = COALESCE(user_achievements.earned_at, EXCLUDED.earned_at)`,
    [userId, achievementId, progress, earnedAt],
  );
}

export async function getAchievementProgressContext(userId: string) {
  const result = await runQuery<AchievementProgressContextRow>(
    `SELECT
       COALESCE((
         SELECT COUNT(*)
         FROM quest_completions qc
         WHERE qc.user_id = $1
           AND qc.status = 'approved'
       ), 0)::text AS approved_quest_count,
       COALESCE((
         SELECT COUNT(*)
         FROM referrals r
         WHERE r.referrer_user_id = $1
       ), 0)::text AS invited_count,
       COALESCE((
         SELECT COUNT(*)
         FROM referrals r
         WHERE r.referrer_user_id = $1
           AND r.referee_subscribed = TRUE
       ), 0)::text AS converted_count,
       COALESCE((
         SELECT COUNT(*)
         FROM user_identities ui
         WHERE ui.user_id = $1
           AND ui.provider = 'multiversx'
           AND ui.status = 'active'
       ), 0)::text AS linked_wallet_count,
       COALESCE((
         SELECT COUNT(*)
         FROM quest_completions qc
         INNER JOIN quest_definitions q ON q.id = qc.quest_id
         WHERE qc.user_id = $1
           AND qc.status = 'approved'
           AND q.verification_type = 'manual-review'
       ), 0)::text AS approved_manual_review_count,
       COALESCE((
         SELECT COUNT(*)
         FROM quest_completions qc
         INNER JOIN quest_definitions q ON q.id = qc.quest_id
         WHERE qc.user_id = $1
           AND qc.status = 'approved'
           AND q.recurrence = 'daily'
       ), 0)::text AS approved_daily_quest_count`,
    [userId],
  );

  return {
    approvedQuestCount: Number(result.rows[0]?.approved_quest_count ?? 0),
    invitedCount: Number(result.rows[0]?.invited_count ?? 0),
    convertedCount: Number(result.rows[0]?.converted_count ?? 0),
    linkedWalletCount: Number(result.rows[0]?.linked_wallet_count ?? 0),
    approvedManualReviewCount: Number(result.rows[0]?.approved_manual_review_count ?? 0),
    approvedDailyQuestCount: Number(result.rows[0]?.approved_daily_quest_count ?? 0),
  };
}
