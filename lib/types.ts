export type SubscriptionTier = "free" | "monthly" | "annual";
export type AppRole = "super_admin" | "admin" | "reviewer";
export type TokenAsset = "EMR" | "EGLD" | "PARTNER";
export type CampaignSource = "direct" | "zealy" | "galxe" | "layer3";
export type QuestTrack =
  | "starter"
  | "daily"
  | "social"
  | "wallet"
  | "referral"
  | "premium"
  | "ambassador"
  | "quiz"
  | "creative"
  | "campaign";
export type QuestCadence = "one_time" | "daily" | "weekly" | "campaign_limited";
export type TokenEffect = "none" | "eligibility_progress" | "token_bonus" | "direct_token_reward";
export type TrustScoreBand = "low" | "medium" | "high";
export type UserJourneyState =
  | "visitor"
  | "signed_up_free"
  | "activated_free"
  | "reward_eligible_free"
  | "monthly_premium"
  | "annual_premium"
  | "ambassador_candidate"
  | "ambassador";
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
  track?: QuestTrack;
  cadence?: QuestCadence;
  xpReward: number;
  projectedXp?: number;
  tokenEffect?: TokenEffect;
  projectedDirectTokenReward?: {
    asset: TokenAsset;
    amount: number;
  };
  difficulty: "easy" | "medium" | "hard";
  verificationType: VerificationType;
  status: QuestStatus;
  lockedReason?: string | null;
  unlockHint?: string | null;
  recommended?: boolean;
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
  metadata: Record<string, unknown>;
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
  category?: string;
  progress: number;
  unlocked: boolean;
};

export type UserSnapshot = {
  displayName: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  xpMultiplier: number;
  nextLevelXp: number;
  tier: SubscriptionTier;
  journeyState: UserJourneyState;
  campaignSource: CampaignSource | null;
  rank: number;
  referralCode: string;
  starterPath: {
    complete: boolean;
    progress: number;
    steps: Array<{
      label: string;
      complete: boolean;
      detail: string;
    }>;
  };
  rewardEligibility: {
    eligible: boolean;
    trustScoreBand: TrustScoreBand;
    nextRequirement: string | null;
  };
  weeklyProgress: {
    xp: number;
    tierLabel: string;
    currentThreshold: number;
    nextThreshold: number | null;
    maxThreshold: number;
    progress: number;
  };
  tokenProgram: {
    status: "locked" | "earning" | "redeemable";
    asset: TokenAsset;
    redemptionEnabled: boolean;
    eligibilityPoints: number;
    minimumPoints: number;
    projectedRedemptionAmount: number;
    claimedBalance: number;
    settledBalance: number;
    nextRedemptionPoints: number | null;
    tierMultiplier: number;
    scheduledDirectRewards: Array<{
      asset: TokenAsset;
      amount: number;
    }>;
    redemptionHistory: Array<{
      id: string;
      asset: TokenAsset;
      tokenAmount: number;
      eligibilityPointsSpent: number;
      status: "claimed" | "settled";
      source: string;
      createdAt: string;
      settledAt: string | null;
      receiptReference: string | null;
      settlementNote: string | null;
      settledByDisplayName: string | null;
    }>;
    nextStep: string;
    notifications: Array<{
      id: string;
      tone: "info" | "success" | "warning";
      title: string;
      detail: string;
    }>;
  };
  referral: {
    rank: number;
    invitedCount: number;
    convertedCount: number;
    rewardXpEarned: number;
    pendingConversionXp: number;
    rewardPreview: {
      monthlyPremiumReferral: {
        xp: number;
        tokenEffect: TokenEffect;
      };
      annualPremiumReferral: {
        xp: number;
        tokenEffect: TokenEffect;
        directTokenReward?: {
          asset: TokenAsset;
          amount: number;
        };
      };
      sourceBonuses: Array<{
        source: CampaignSource;
        label: string;
        signupXp: number;
        monthlyPremiumXp: number;
        annualPremiumXp: number;
        annualDirectTokenReward: {
          asset: TokenAsset;
          amount: number;
        };
      }>;
    };
    recentReferrals: Array<{
      displayName: string;
      tier: SubscriptionTier;
      status: "joined" | "converted";
      joinedAt: string;
      source?: CampaignSource | null;
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
  economy: {
    payoutAsset: TokenAsset;
    xpMultipliers: Record<SubscriptionTier, number>;
    tokenMultipliers: Record<SubscriptionTier, number>;
  };
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
    roles: AppRole[];
  }>;
  adminDirectory: Array<{
    userId: string;
    displayName: string;
    email: string | null;
    role: Extract<AppRole, "super_admin" | "admin">;
    grantedAt: string | null;
    grantedByDisplayName: string | null;
  }>;
  referralAnalytics: {
    invitedCount: number;
    convertedCount: number;
    conversionRate: number;
    rewardXpEarned: number;
    pendingConversionXp: number;
    sourceBreakdown: Array<{
      source: string;
      invitedCount: number;
      convertedCount: number;
    }>;
    conversionWindows: Array<{
      label: string;
      count: number;
    }>;
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
  queueMetrics: {
    pendingCount: number;
    oldestPendingMinutes: number;
    averagePendingMinutes: number;
    staleCount: number;
    alerts: Array<{
      severity: "warning" | "critical";
      title: string;
      detail: string;
    }>;
    byVerificationType: Array<{
      verificationType: VerificationType;
      count: number;
    }>;
  };
  moderationNotifications: Array<{
    channel: "inbox" | "webhook" | "email" | "slack" | "discord";
    enabled: boolean;
    status: "idle" | "armed";
    destination: string;
    title: string;
    detail: string;
  }>;
  moderationNotificationHistory: Array<{
    id: string;
    channel: "inbox" | "webhook" | "email" | "slack" | "discord";
    eventStatus: "armed" | "sent" | "acknowledged";
    destination: string;
    title: string;
    detail: string;
    createdAt: string;
    acknowledgedAt: string | null;
    acknowledgedByDisplayName: string | null;
  }>;
  economySettings: EconomySettings;
  economySettingsAudit: EconomySettingsAuditEntry[];
  tokenSettlementQueue: Array<TokenSettlementItem>;
  settlementAnalytics: {
    pendingCount: number;
    pendingTokenAmount: number;
    oldestPendingHours: number;
    averageSettlementHours: number;
    settledLast7DaysCount: number;
    settledLast7DaysTokenAmount: number;
    directRewardPendingCount: number;
    directRewardSettledCount: number;
    directRewardSettledTokenAmount: number;
    redemptionVelocityPerDay: number;
  };
  reviewInsights: {
    byVerificationType: Array<{
      verificationType: VerificationType;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    }>;
    reviewerTypeMatrix: Array<{
      reviewerDisplayName: string;
      verificationType: VerificationType;
      reviewCount: number;
    }>;
  };
  questDefinitionDirectory?: Array<QuestDefinitionAdminItem>;
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

export type UnlockRule =
  | { type: "min_level"; value: number }
  | { type: "wallet_linked"; value: true }
  | { type: "starter_path_complete"; value: true }
  | { type: "subscription_tier"; value: Extract<SubscriptionTier, "monthly" | "annual"> }
  | { type: "connected_social_count"; value: number }
  | { type: "connected_social"; value: string }
  | { type: "successful_referrals"; value: number }
  | { type: "monthly_premium_referrals"; value: number }
  | { type: "annual_premium_referrals"; value: number }
  | { type: "ambassador_candidate"; value: true }
  | { type: "ambassador_active"; value: true }
  | { type: "campaign_source"; value: "direct" | "zealy" | "galxe" | "layer3" }
  | { type: "trust_score_band"; value: Exclude<TrustScoreBand, "low"> }
  | { type: "wallet_age_days"; value: number }
  | { type: "quest_completed"; value: string }
  | { type: "weekly_xp_min"; value: number }
  | { type: "runtime_flag"; value: "flashRewardDay" | "referralBoostWeek" };

export type UnlockRuleGroup = {
  all?: UnlockRule[];
  any?: UnlockRule[];
};

export type RewardConfig = {
  xp: {
    base: number;
    premiumMultiplierEligible: boolean;
  };
  tokenEffect?: TokenEffect;
  tokenEligibility?: {
    progressPoints: number;
  };
  tokenBonus?: {
    multiplier: number;
  };
  directTokenReward?: {
    asset: TokenAsset;
    amount: number;
    requiresWallet: boolean;
  };
  referralBonus?: {
    xpBonus: number;
    tokenBonusMultiplier?: number;
  };
};

export type QueueAlertThresholds = {
  staleMinutes: number;
  oldestWarningMinutes: number;
  backlogWarningCount: number;
  backlogCriticalCount: number;
  averageWarningMinutes: number;
};

export type ModerationAlertChannelConfig = {
  inboxEnabled: boolean;
  webhookUrl: string | null;
  emailRecipient: string | null;
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
};

export type TokenRedemptionProgram = {
  asset: TokenAsset;
  minimumEligibilityPoints: number;
  pointsPerToken: number;
  tierMultipliers: Record<SubscriptionTier, number>;
};

export type EconomySettings = {
  id: string;
  payoutAsset: TokenAsset;
  redemptionEnabled: boolean;
  directRewardsEnabled: boolean;
  directAnnualReferralEnabled: boolean;
  directPremiumFlashEnabled: boolean;
  directAmbassadorEnabled: boolean;
  minimumEligibilityPoints: number;
  pointsPerToken: number;
  xpTierMultipliers: Record<SubscriptionTier, number>;
  tokenTierMultipliers: Record<SubscriptionTier, number>;
  referralSignupBaseXp: number;
  referralMonthlyConversionBaseXp: number;
  referralAnnualConversionBaseXp: number;
  annualReferralDirectTokenAmount: number;
  campaignOverrides: Record<CampaignSource, {
    signupBonusXp: number;
    monthlyConversionBonusXp: number;
    annualConversionBonusXp: number;
    annualDirectTokenBonus: number;
    questXpMultiplierBonus: number;
    eligibilityPointsMultiplierBonus: number;
    tokenYieldMultiplierBonus: number;
    minimumEligibilityPointsOffset: number;
    directTokenRewardBonus: number;
  }>;
  updatedAt: string;
};

export type EconomySettingsAuditEntry = {
  id: string;
  changedByDisplayName: string | null;
  createdAt: string;
  summary: string;
};

export type CompletionRuleGroup = {
  cooldownHours?: number;
  requiresReview?: boolean;
  requiresWalletOwnership?: boolean;
  requiresLinkedSocial?: string[];
  quizPassScore?: number;
  minWalletAgeDays?: number;
  campaignWindowRequired?: boolean;
};

export type PreviewConfig = {
  desirability?: number;
  label?: string;
};

export type UserProgressState = {
  userId: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  weeklyXp: number;
  starterPathComplete: boolean;
  rewardEligible: boolean;
  walletLinked: boolean;
  walletAgeDays: number;
  trustScoreBand: TrustScoreBand;
  subscriptionTier: SubscriptionTier;
  connectedSocials: string[];
  successfulReferralCount: number;
  monthlyPremiumReferralCount: number;
  annualPremiumReferralCount: number;
  connectedSocialCount: number;
  approvedQuestCount: number;
  starterQuestCount: number;
  wellnessQuestCount: number;
  socialQuestCount: number;
  completedQuestSlugs: string[];
  ambassadorCandidate: boolean;
  ambassadorActive: boolean;
  campaignSource: CampaignSource | null;
};

export type QuestRuntimeContext = {
  now: string;
  activeCampaignSlugs: string[];
  flashRewardDay: boolean;
  referralBoostWeek: boolean;
};

export type EvaluatedQuest = {
  id: string;
  title: string;
  track: QuestTrack;
  status: "active" | "locked" | "completed" | "in_progress" | "cooldown" | "rejected";
  visible: boolean;
  lockedReason: string | null;
  unlockHint: string | null;
  projectedReward: {
    xp: number;
    tokenEffect: TokenEffect;
    directTokenReward?: {
      asset: string;
      amount: number;
    };
  };
  sortScore: number;
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

export type QuestDefinitionAdminItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: "easy" | "medium" | "hard";
  verificationType: VerificationType;
  recurrence: "one-time" | "daily" | "weekly";
  requiredTier: SubscriptionTier;
  requiredLevel: number;
  xpReward: number;
  isPremiumPreview: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TokenSettlementItem = {
  id: string;
  userDisplayName: string;
  userEmail: string | null;
  asset: TokenAsset;
  tokenAmount: number;
  eligibilityPointsSpent: number;
  source: string;
  createdAt: string;
  settledAt: string | null;
  receiptReference: string | null;
  settlementNote: string | null;
  settledByDisplayName: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type WalletQuestResult = {
  walletAddress: string;
  linkedAt: string;
  walletAgeDays: number;
};
