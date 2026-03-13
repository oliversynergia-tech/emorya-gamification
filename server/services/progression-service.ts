import type { QuestProgressUpdate } from "@/lib/types";
import { calculateQuestRewardTransition } from "@/server/services/progression-rules";
import {
  getAchievementDefinitions,
  getUserAchievementsByUserId,
  upsertUserAchievement,
} from "@/server/repositories/achievement-repository";
import {
  createActivityLogEntry,
  getUserProgressById,
  hasQuestApprovalActivityToday,
  updateUserProgressById,
} from "@/server/repositories/progression-repository";
import { setQuestCompletionAwardedXp } from "@/server/repositories/quest-repository";

function normalizeAchievementTarget(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

async function syncAchievementProgress({
  userId,
  displayName,
  currentStreak,
  subscriptionTier,
  attributionSource,
}: {
  userId: string;
  displayName: string;
  currentStreak: number;
  subscriptionTier: string;
  attributionSource: string | null;
}) {
  const [definitions, userAchievements] = await Promise.all([
    getAchievementDefinitions(),
    getUserAchievementsByUserId(userId),
  ]);

  const unlockedAchievements: string[] = [];

  for (const definition of definitions) {
    let progress = 0;

    if (definition.slug === "zealy-veteran") {
      const sourceTarget = normalizeAchievementTarget(definition.condition.source);
      const userSource = normalizeAchievementTarget(attributionSource);
      progress = sourceTarget !== null && userSource === sourceTarget ? 1 : 0;
    }

    if (definition.slug === "streak-machine") {
      const dayTarget = Number(definition.condition.days ?? 0);
      progress = dayTarget > 0 ? Math.min(currentStreak / dayTarget, 1) : 0;
    }

    if (definition.slug === "premium-champion") {
      const tierTarget = normalizeAchievementTarget(definition.condition.tier);
      const userTier = normalizeAchievementTarget(subscriptionTier);
      progress = tierTarget !== null && userTier === tierTarget ? 1 : 0;
    }

    const existing = userAchievements.get(definition.slug);
    const clampedProgress = Math.max(progress, existing?.progress ?? 0);
    const shouldUnlock = clampedProgress >= 1;
    const earnedAt = shouldUnlock ? existing?.earnedAt ?? new Date().toISOString() : null;

    await upsertUserAchievement({
      userId,
      achievementId: definition.id,
      progress: clampedProgress,
      earnedAt,
    });

    if (shouldUnlock && !existing?.earnedAt) {
      unlockedAchievements.push(definition.name);
      await createActivityLogEntry({
        userId,
        actionType: "achievement-unlocked",
        xpEarned: 0,
        metadata: {
          actor: displayName,
          action: "unlocked an achievement",
          detail: definition.name,
          achievement: definition.slug,
        },
      });
    }
  }

  return unlockedAchievements;
}

export async function applyQuestRewardTransition({
  userId,
  completionId,
  questId,
  questTitle,
  questXpReward,
  previousAwardedXp,
  shouldBeApproved,
}: {
  userId: string;
  completionId: string;
  questId: string;
  questTitle: string;
  questXpReward: number;
  previousAwardedXp: number;
  shouldBeApproved: boolean;
}): Promise<QuestProgressUpdate> {
  const user = await getUserProgressById(userId);

  if (!user) {
    throw new Error("User not found for progression update.");
  }

  const rewardState = calculateQuestRewardTransition({
    subscriptionTier: user.subscription_tier,
    questXpReward,
    previousAwardedXp,
    totalXp: user.total_xp,
    level: user.level,
    currentStreak: user.current_streak,
    longestStreak: user.longest_streak,
    shouldBeApproved,
    alreadyApprovedToday: shouldBeApproved
      ? await hasQuestApprovalActivityToday(userId)
      : false,
  });

  const completion = await setQuestCompletionAwardedXp({
    completionId,
    awardedXp: rewardState.xpAwarded,
  });

  if (!completion) {
    throw new Error("Completion not found for reward update.");
  }

  const deltaXp = rewardState.deltaXp;

  if (deltaXp === 0) {
    const unlockedAchievements = await syncAchievementProgress({
      userId,
      displayName: user.display_name,
      currentStreak: user.current_streak,
      subscriptionTier: user.subscription_tier,
      attributionSource: user.attribution_source,
    });

    return {
      xpAwarded: rewardState.xpAwarded,
      deltaXp,
      level: user.level,
      currentStreak: user.current_streak,
      unlockedAchievements,
    };
  }

  const updatedUser = await updateUserProgressById({
    userId,
    totalXp: rewardState.totalXp,
    level: rewardState.level,
    currentStreak: rewardState.currentStreak,
    longestStreak: rewardState.longestStreak,
  });

  const achievementUser = updatedUser ?? {
    display_name: user.display_name,
    subscription_tier: user.subscription_tier,
    attribution_source: user.attribution_source,
  };

  const unlockedAchievements = await syncAchievementProgress({
    userId,
    displayName: achievementUser.display_name,
    currentStreak: rewardState.currentStreak,
    subscriptionTier: achievementUser.subscription_tier,
    attributionSource: achievementUser.attribution_source,
  });

  await createActivityLogEntry({
    userId,
    actionType: deltaXp > 0 ? "quest-approved" : "quest-reward-adjusted",
    xpEarned: deltaXp,
    metadata: {
      actor: user.display_name,
      action: deltaXp > 0 ? "earned quest XP" : "had quest XP adjusted",
      detail:
        deltaXp > 0
          ? `${questTitle} awarded ${deltaXp} XP`
          : `${questTitle} adjusted by ${deltaXp} XP`,
      questId,
      questTitle,
      awardedXp: rewardState.xpAwarded,
      level: rewardState.level,
      streak: rewardState.currentStreak,
      timeAgo: "just now",
    },
  });

  return {
    xpAwarded: rewardState.xpAwarded,
    deltaXp,
    level: rewardState.level,
    currentStreak: rewardState.currentStreak,
    unlockedAchievements,
  };
}
