import { getLevelProgress, getTierMultiplier } from "@/lib/progression";
import {
  createActivityLogEntry,
  getUserProgressById,
  hasQuestApprovalActivityToday,
  updateUserProgressById,
} from "@/server/repositories/progression-repository";
import { setQuestCompletionAwardedXp } from "@/server/repositories/quest-repository";

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
}) {
  const user = await getUserProgressById(userId);

  if (!user) {
    throw new Error("User not found for progression update.");
  }

  const targetAward = shouldBeApproved
    ? Math.round(questXpReward * getTierMultiplier(user.subscription_tier))
    : 0;

  const completion = await setQuestCompletionAwardedXp({
    completionId,
    awardedXp: targetAward,
  });

  if (!completion) {
    throw new Error("Completion not found for reward update.");
  }

  const deltaXp = targetAward - previousAwardedXp;

  if (deltaXp === 0) {
    return {
      xpAwarded: targetAward,
      deltaXp,
      level: user.level,
      currentStreak: user.current_streak,
    };
  }

  const nextTotalXp = Math.max(user.total_xp + deltaXp, 0);
  const nextLevel = getLevelProgress(nextTotalXp).level;

  let nextCurrentStreak = user.current_streak;
  let nextLongestStreak = user.longest_streak;

  if (deltaXp > 0 && shouldBeApproved) {
    const alreadyApprovedToday = await hasQuestApprovalActivityToday(userId);

    if (!alreadyApprovedToday) {
      nextCurrentStreak += 1;
      nextLongestStreak = Math.max(nextLongestStreak, nextCurrentStreak);
    }
  }

  await updateUserProgressById({
    userId,
    totalXp: nextTotalXp,
    level: nextLevel,
    currentStreak: nextCurrentStreak,
    longestStreak: nextLongestStreak,
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
      awardedXp: targetAward,
      level: nextLevel,
      streak: nextCurrentStreak,
      timeAgo: "just now",
    },
  });

  return {
    xpAwarded: targetAward,
    deltaXp,
    level: nextLevel,
    currentStreak: nextCurrentStreak,
  };
}
