import type { SubscriptionTier } from "../../lib/types.ts";

export type RankableUser = {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  tier: SubscriptionTier;
  badges: number;
  createdAt: string;
};

export function mapLeaderboardDelta(currentRank: number, previousRank: number | null) {
  if (!previousRank) {
    return 0;
  }

  return previousRank - currentRank;
}

export function rankLeaderboardEntries(users: RankableUser[]) {
  const sorted = [...users].sort((left, right) => {
    if (right.xp !== left.xp) {
      return right.xp - left.xp;
    }

    if (right.level !== left.level) {
      return right.level - left.level;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });

  let lastRank = 0;
  let previousUser: RankableUser | null = null;

  return sorted.map((user, index) => {
    const rank =
      previousUser &&
      previousUser.xp === user.xp &&
      previousUser.level === user.level
        ? lastRank
        : index + 1;

    lastRank = rank;
    previousUser = user;

    return {
      rank,
      displayName: user.displayName,
      level: user.level,
      xp: user.xp,
      badges: user.badges,
      tier: user.tier,
      delta: 0,
    };
  });
}
