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
