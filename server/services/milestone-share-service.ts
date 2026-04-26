import { getSharePreset, type ShareData } from "@/lib/share-presets";
import { runQuery } from "@/server/db/client";
import { getQuestRuntimeContext } from "@/server/repositories/runtime-flag-repository";

export const milestoneTriggerQuestMap = {
  "convert-your-first-calories": "first_calorie_conversion",
  "weekly-warrior": "weekly_warrior_complete",
  "upgrade-to-premium-monthly": "premium_unlock",
  "emorya-marathon": "marathon_complete",
} as const;

type TriggerQuestSlug = keyof typeof milestoneTriggerQuestMap;

type PendingMilestoneShareRow = {
  slug: TriggerQuestSlug;
  completed_at: string;
};

export async function getPendingMilestoneSharePromptForUser({
  userId,
  displayName,
  profileUrl,
}: {
  userId: string;
  displayName: string;
  profileUrl: string;
}): Promise<ShareData | null> {
  const runtimeContext = await getQuestRuntimeContext();

  if (!runtimeContext.milestone_share_enabled) {
    return null;
  }

  const triggerQuestSlugs = Object.keys(milestoneTriggerQuestMap) as TriggerQuestSlug[];
  const shareQuestSlugs = [
    "share-first-calorie-conversion-celebration",
    "share-your-7-day-streak-win",
    "share-your-premium-unlock",
    "share-your-marathon-completion",
  ];
  const result = await runQuery<PendingMilestoneShareRow>(
    `SELECT q.slug, qc.completed_at
     FROM quest_completions qc
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     WHERE qc.user_id = $1
       AND qc.status = 'approved'
       AND q.slug = ANY($2::text[])
       AND NOT EXISTS (
         SELECT 1
         FROM quest_completions share_qc
         INNER JOIN quest_definitions share_q ON share_q.id = share_qc.quest_id
         WHERE share_qc.user_id = $1
           AND share_q.slug = ANY($3::text[])
           AND (
             (q.slug = 'convert-your-first-calories' AND share_q.slug = 'share-first-calorie-conversion-celebration')
             OR (q.slug = 'weekly-warrior' AND share_q.slug = 'share-your-7-day-streak-win')
             OR (q.slug = 'upgrade-to-premium-monthly' AND share_q.slug = 'share-your-premium-unlock')
             OR (q.slug = 'emorya-marathon' AND share_q.slug = 'share-your-marathon-completion')
           )
       )
     ORDER BY qc.completed_at DESC NULLS LAST
     LIMIT 1`,
    [userId, triggerQuestSlugs, shareQuestSlugs],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const milestone = milestoneTriggerQuestMap[row.slug];
  return getSharePreset(milestone, displayName, profileUrl);
}
