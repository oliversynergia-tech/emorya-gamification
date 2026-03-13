export type SubscriptionTier = "free" | "monthly" | "annual";
export type AuthProvider = "email" | "multiversx";
export type IdentityStatus = "active" | "pending" | "revoked";
export type VerificationType =
  | "social-oauth"
  | "wallet-check"
  | "quiz"
  | "manual-review"
  | "link-visit"
  | "text-submission";

export type QuestCategory =
  | "social"
  | "learn"
  | "app"
  | "staking"
  | "creative"
  | "referral"
  | "limited";

export type QuestStatus = "available" | "locked" | "in-progress" | "completed" | "rejected";
export type CompletionStatus = "pending" | "approved" | "rejected";

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  xpReward: number;
  difficulty: "easy" | "medium" | "hard";
  verificationType: VerificationType;
  status: QuestStatus;
  requiredLevel: number;
  requiredTier: SubscriptionTier;
  premiumPreview?: boolean;
  timebox?: string;
  targetUrl?: string;
};

export type UserRecord = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  attributionSource: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  subscriptionTier: SubscriptionTier;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
};

export type UserIdentityRecord = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  status: IdentityStatus;
  createdAt: string;
};

export type UserSessionRecord = {
  id: string;
  userId: string;
  sessionTokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
};

export type WalletLinkChallengeRecord = {
  id: string;
  userId: string;
  walletAddress: string;
  challengeMessage: string;
  nonce: string;
  expiresAt: string;
  createdAt: string;
};

export type SocialConnectionRecord = {
  id: string;
  userId: string;
  platform: string;
  handle: string | null;
  verified: boolean;
  connectedAt: string | null;
};

export type SocialConnectionState = {
  platform: string;
  handle: string | null;
  verified: boolean;
  connectedAt: string | null;
};

export type QuestDefinitionRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: QuestCategory;
  xpReward: number;
  difficulty: "easy" | "medium" | "hard";
  verificationType: VerificationType;
  recurrence: "one-time" | "daily" | "weekly";
  requiredTier: SubscriptionTier;
  requiredLevel: number;
  isPremiumPreview: boolean;
  isActive: boolean;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type QuestCompletionRecord = {
  id: string;
  userId: string;
  questId: string;
  status: CompletionStatus;
  submissionData: Record<string, string | number | boolean | null>;
  reviewedBy: string | null;
  completedAt: string | null;
  awardedXp: number;
};

export type AchievementRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  condition: Record<string, string | number | boolean | null>;
};

export type ReferralRecord = {
  id: string;
  referrerUserId: string;
  refereeUserId: string;
  refereeSubscribed: boolean;
  createdAt: string;
};

export type ActivityLogRecord = {
  id: string;
  userId: string;
  actionType: string;
  xpEarned: number;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
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
  referral: {
    rank: number;
    invitedCount: number;
    convertedCount: number;
    rewardXpEarned: number;
    pendingConversionXp: number;
    recentReferrals: Array<{
      displayName: string;
      tier: SubscriptionTier;
      status: "joined" | "converted";
      joinedAt: string;
    }>;
  };
  connectedAccounts: Array<{
    platform: string;
    connected: boolean;
    rewardXp: number;
  }>;
};

export type DashboardData = {
  user: UserSnapshot;
  quests: Quest[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  referralLeaderboard: LeaderboardEntry[];
  activityFeed: ActivityItem[];
  premiumMoments: string[];
};

export type AdminOverviewData = {
  stats: Array<{
    label: string;
    value: string;
  }>;
  roleDirectory: Array<{
    userId: string;
    displayName: string;
    email: string | null;
    subscriptionTier: SubscriptionTier;
    roles: Array<"admin" | "reviewer">;
  }>;
  referralAnalytics: {
    invitedCount: number;
    convertedCount: number;
    conversionRate: number;
    rewardXpEarned: number;
    pendingConversionXp: number;
    topReferrers: Array<{
      displayName: string;
      tier: SubscriptionTier;
      invitedCount: number;
      convertedCount: number;
      rewardXpEarned: number;
    }>;
  };
  reviewQueue: ReviewQueueItem[];
  reviewHistory: ReviewHistoryItem[];
  reviewerWorkload: Array<{
    reviewerDisplayName: string;
    reviewCount: number;
    approvals: number;
    rejections: number;
  }>;
};

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  subscriptionTier: SubscriptionTier;
};

export type AuthSession = {
  user: AuthUser;
  walletAddresses: string[];
};

export type ProfileData = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  attributionSource: string | null;
  subscriptionTier: SubscriptionTier;
  referralCode: string;
  walletAddresses: string[];
  socialConnections: SocialConnectionState[];
};

export type ReviewQueueItem = {
  id: string;
  questId: string;
  questTitle: string;
  userDisplayName: string;
  userEmail: string | null;
  verificationType: VerificationType;
  submissionData: Record<string, string | number | boolean | null>;
  status: CompletionStatus;
  createdAt: string;
};

export type ReviewHistoryItem = {
  id: string;
  questId: string;
  questTitle: string;
  userDisplayName: string;
  userEmail: string | null;
  reviewerDisplayName: string | null;
  verificationType: VerificationType;
  submissionData: Record<string, string | number | boolean | null>;
  status: Extract<CompletionStatus, "approved" | "rejected">;
  awardedXp: number;
  reviewedAt: string;
};

export type ManualReviewSubmission = {
  contentUrl: string;
  screenshotUrl: string | null;
  platform: string | null;
  note: string | null;
  submittedAt: string;
  moderationNote?: string | null;
  moderatedAt?: string | null;
};

export type QuestProgressUpdate = {
  xpAwarded: number;
  deltaXp: number;
  level: number;
  currentStreak: number;
  unlockedAchievements?: string[];
};
