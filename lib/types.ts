export type SubscriptionTier = "free" | "monthly" | "annual";

export type QuestCategory =
  | "social"
  | "learn"
  | "app"
  | "staking"
  | "creative"
  | "referral"
  | "limited";

export type QuestStatus = "available" | "locked" | "in-progress" | "completed";

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  xpReward: number;
  difficulty: "easy" | "medium" | "hard";
  status: QuestStatus;
  requiredLevel: number;
  requiredTier: SubscriptionTier;
  premiumPreview?: boolean;
  timebox?: string;
};

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timeAgo: string;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  level: number;
  xp: number;
  badges: number;
  tier: SubscriptionTier;
  delta: number;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  progress: number;
  unlocked: boolean;
};

export type UserSnapshot = {
  displayName: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  nextLevelXp: number;
  tier: SubscriptionTier;
  rank: number;
  referralCode: string;
  connectedAccounts: Array<{
    platform: string;
    connected: boolean;
    rewardXp: number;
  }>;
};
