import type { QuestProgressUpdate } from "@/lib/types";
import { calculateQuestRewardTransition } from "@/server/services/progression-rules";
import {
  getAchievementDefinitions,
  getAchievementProgressContext,
  getUserAchievementsByUserId,
  upsertUserAchievement,
} from "@/server/repositories/achievement-repository";
import { getActiveEconomySettings } from "@/server/repositories/economy-settings-repository";
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
  level,
  subscriptionTier,
  totalXp,
  attributionSource,
}: {
  userId: string;
  displayName: string;
  currentStreak: number;
  level: number;
  subscriptionTier: string;
  totalXp: number;
  attributionSource: string | null;
}) {
  const [definitions, userAchievements] = await Promise.all([
    getAchievementDefinitions(),
    getUserAchievementsByUserId(userId),
  ]);
  const metrics = await getAchievementProgressContext(userId);

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

    if (definition.slug === "quest-climber") {
      const questTarget = Number(definition.condition.approvedQuests ?? 0);
      progress = questTarget > 0 ? Math.min(metrics.approvedQuestCount / questTarget, 1) : 0;
    }

    if (definition.slug === "referral-catalyst") {
      const inviteTarget = Number(definition.condition.invitedCount ?? 0);
      progress = inviteTarget > 0 ? Math.min(metrics.invitedCount / inviteTarget, 1) : 0;
    }

    if (definition.slug === "conversion-closer") {
      const conversionTarget = Number(definition.condition.convertedCount ?? 0);
      progress = conversionTarget > 0 ? Math.min(metrics.convertedCount / conversionTarget, 1) : 0;
    }

    if (definition.slug === "level-ascendant") {
      const levelTarget = Number(definition.condition.level ?? 0);
      progress = levelTarget > 0 ? Math.min(level / levelTarget, 1) : 0;
    }

    if (definition.slug === "xp-collector") {
      const xpTarget = Number(definition.condition.totalXp ?? 0);
      progress = xpTarget > 0 ? Math.min(totalXp / xpTarget, 1) : 0;
    }

    if (definition.slug === "wallet-synced") {
      const walletTarget = Number(definition.condition.linkedWallets ?? 0);
      progress = walletTarget > 0 ? Math.min(metrics.linkedWalletCount / walletTarget, 1) : 0;
    }

    if (definition.slug === "creator-signal") {
      const creatorTarget = Number(definition.condition.manualReviewApprovals ?? 0);
      progress = creatorTarget > 0 ? Math.min(metrics.approvedManualReviewCount / creatorTarget, 1) : 0;
    }

    if (definition.slug === "daily-ritual") {
      const dailyTarget = Number(definition.condition.dailyApprovals ?? 0);
      progress = dailyTarget > 0 ? Math.min(metrics.approvedDailyQuestCount / dailyTarget, 1) : 0;
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

export async function syncAchievementProgressForUser({
  userId,
  displayName,
  currentStreak,
  level,
  subscriptionTier,
  totalXp,
  attributionSource,
}: {
  userId: string;
  displayName: string;
  currentStreak: number;
  level: number;
  subscriptionTier: string;
  totalXp: number;
  attributionSource: string | null;
}) {
  return syncAchievementProgress({
    userId,
    displayName,
    currentStreak,
    level,
    subscriptionTier,
    totalXp,
    attributionSource,
  });
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

  const economySettings = await getActiveEconomySettings();
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
    settings: economySettings,
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
      level: user.level,
      subscriptionTier: user.subscription_tier,
      totalXp: user.total_xp,
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
    level: rewardState.level,
    subscriptionTier: achievementUser.subscription_tier,
    totalXp: rewardState.totalXp,
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
