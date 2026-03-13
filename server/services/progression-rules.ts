import { getLevelProgress, getTierMultiplier } from "../../lib/progression.ts";
import type { SubscriptionTier } from "../../lib/types.ts";

export function calculateQuestRewardTransition({
  subscriptionTier,
  questXpReward,
  previousAwardedXp,
  totalXp,
  level,
  currentStreak,
  longestStreak,
  shouldBeApproved,
  alreadyApprovedToday,
}: {
  subscriptionTier: SubscriptionTier;
  questXpReward: number;
  previousAwardedXp: number;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  shouldBeApproved: boolean;
  alreadyApprovedToday: boolean;
}) {
  const xpAwarded = shouldBeApproved
    ? Math.round(questXpReward * getTierMultiplier(subscriptionTier))
    : 0;
  const deltaXp = xpAwarded - previousAwardedXp;
  const nextTotalXp = Math.max(totalXp + deltaXp, 0);
  const nextLevel = deltaXp === 0 ? level : getLevelProgress(nextTotalXp).level;

  let nextCurrentStreak = currentStreak;
  let nextLongestStreak = longestStreak;

  if (deltaXp > 0 && shouldBeApproved && !alreadyApprovedToday) {
    nextCurrentStreak += 1;
    nextLongestStreak = Math.max(nextLongestStreak, nextCurrentStreak);
  }

  return {
    xpAwarded,
    deltaXp,
    totalXp: nextTotalXp,
    level: nextLevel,
    currentStreak: nextCurrentStreak,
    longestStreak: nextLongestStreak,
  };
}
