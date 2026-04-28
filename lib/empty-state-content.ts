export const emptyStates = {
  questBoardNoQuests: {
    title: "No quests available",
    message:
      "No quests available right now. Keep levelling up to unlock new ones, or check back tomorrow for daily resets.",
  },
  questBoardAllDailyDone: {
    title: "All done for today",
    message: "You've finished all your daily quests. Nice work. Come back tomorrow for a fresh set.",
  },
  achievementsNone: {
    title: "No achievements yet",
    message:
      "No achievements earned yet. Complete quests, build streaks, and refer friends to unlock your first badge.",
  },
  leaderboardNotRanked: {
    title: "Not ranked yet",
    message: "You're not on the board yet. Complete a few quests to earn XP and claim your spot.",
  },
  leaderboardNoData: {
    title: "No data yet",
    message: "No data for this period yet. Check back after the next snapshot.",
  },
  referralsNone: {
    title: "No referrals yet",
    message:
      "You haven't referred anyone yet. Share your referral link from your profile to get started. You earn XP every time someone signs up.",
  },
  activityFeedEmpty: {
    title: "No recent activity",
    message: "Nothing here yet. Your activity will show up as you complete quests and earn rewards.",
  },
  walletNotConnected: {
    title: "No wallet connected",
    message:
      "No wallet connected. Link your xPortal wallet to unlock staking quests, APY boosts, and token reward eligibility.",
  },
  tokenRedemptionsNone: {
    title: "No redemptions yet",
    message:
      "No redemptions yet. Keep earning eligibility points through quests. You'll be able to redeem once you reach 100 points and redemption is activated.",
  },
  adminQueueEmpty: {
    title: "Queue clear",
    message: "The queue is clear. No submissions waiting for review.",
  },
} as const;

export type EmptyStateKey = keyof typeof emptyStates;
