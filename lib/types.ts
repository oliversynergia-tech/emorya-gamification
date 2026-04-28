export type SubscriptionTier = "free" | "monthly" | "annual";
export type AppRole = "super_admin" | "admin" | "reviewer";
export type TokenAsset = string;
export type CampaignSource = "direct" | "zealy" | "galxe" | "taskon";
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
export type QuestCadence = "one_time" | "daily" | "weekly" | "monthly" | "campaign_limited";
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
  | "completion-check"
  | "api-check"
  | "text-submission";

export type QuestTaskBlock = {
  id: string;
  label: string;
  description?: string;
  platformLabel?: string;
  ctaLabel?: string;
  targetUrl?: string;
  helpUrl?: string;
  verificationReferenceUrl?: string;
  proofType?: string;
  proofInstructions?: string;
  required?: boolean;
};

export type QuestTaskSubmission = {
  taskId: string;
  contentUrl: string | null;
  note: string | null;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  proofFileType?: string | null;
};

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

export type QuestQuizQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
};

export type Quest = {
  id: string;
  slug?: string;
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
  platformLabel?: string;
  ctaLabel?: string;
  targetUrl?: string;
  helpUrl?: string;
  verificationReferenceUrl?: string;
  proofType?: string;
  proofInstructions?: string;
  submissionEvidence?: string[];
  quizPassScore?: number;
  questions?: QuestQuizQuestion[];
  campaignPackId?: string;
  campaignPackLabel?: string;
  taskBlocks?: QuestTaskBlock[];
  unlockRequirements?: QuestUnlockRequirement[];
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
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
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
  submissionData: Record<string, unknown>;
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
  createdAt: string;
};

export type DashboardCampaignPack = DashboardData["campaignPacks"][number];
export type DashboardCampaignPackHistory = DashboardData["campaignPackHistory"][number];

export type LeaderboardEntry = {
  userId: string;
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
  userId: string;
  createdAt: string;
  displayName: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  approvedQuestCount: number;
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
    title: string;
    summary: string;
    nextStepLabel: string | null;
    nextStepDetail: string | null;
    completionLabel: string;
    completionDetail: string;
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
      rewardProgramName?: string | null;
    }>;
    assetBreakdown: Array<{
      asset: TokenAsset;
      claimedAmount: number;
      settledAmount: number;
      totalAmount: number;
      receiptCount: number;
    }>;
    programBreakdown: Array<{
      rewardProgramName: string;
      asset: TokenAsset;
      claimedAmount: number;
      settledAmount: number;
      totalAmount: number;
      receiptCount: number;
    }>;
    redemptionHistory: Array<{
      id: string;
      asset: TokenAsset;
      rewardProgramName: string | null;
      tokenAmount: number;
      eligibilityPointsSpent: number;
      status: "claimed" | "settled";
      workflowState: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
      source: string;
      createdAt: string;
      approvedAt: string | null;
      approvedByDisplayName: string | null;
      processingStartedAt: string | null;
      processingByDisplayName: string | null;
      heldAt: string | null;
      heldByDisplayName: string | null;
      holdReason: string | null;
      failedAt: string | null;
      failedByDisplayName: string | null;
      lastError: string | null;
      cancelledAt: string | null;
      cancelledByDisplayName: string | null;
      cancellationReason: string | null;
      retryCount: number;
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
    campaignPreset: {
      source: CampaignSource | "direct";
      attributionSource: CampaignSource | "direct";
      questXpBoost: number;
      eligibilityBoost: number;
      tokenYieldBoost: number;
      weeklyTargetOffset: number;
      premiumUpsellMultiplier: number;
      leaderboardMomentumMultiplier: number;
      featuredTracks: string[];
    };
  };
  campaignPacks: Array<{
    packId: string;
    label: string;
    lifecycleState: "draft" | "ready" | "live";
    attributionSource: CampaignSource | "direct";
    activeLane: CampaignSource | "direct";
    kind: "bridge" | "feeder" | "mixed";
    totalQuestCount: number;
    completedQuestCount: number;
    inProgressQuestCount: number;
    rejectedQuestCount: number;
    openQuestCount: number;
    featuredTracks: QuestTrack[];
    nextQuestId: string | null;
    nextQuestTitle: string | null;
    nextQuestActionable: boolean;
    ctaLabel: string;
    ctaHref: string | null;
    ctaVariant: string;
    nextAction: string;
    sequenceReason: string;
    tierPhaseCopy: string;
    priorityReason: string;
    blockageState:
      | "wallet_connection"
      | "starter_path"
      | "level"
      | "trust"
      | "premium_phase"
      | "weekly_pace"
      | "ready";
    unlockPreview: string;
    unlockRewardPreview: string;
    unlockOutcomePreview: {
      xp: string;
      eligibility: string;
      premium: string | null;
      directReward: string | null;
    };
    dependencySummary: Array<{
      label: string;
      detail: string;
    }>;
    rewardFocus: string;
    badgeLabel: string;
    leaderboardCallout: string;
    weeklyGoal: {
      targetXp: number;
      shortfallXp: number;
      label: string;
    };
    urgency: string | null;
    onboardingHint: string | null;
    directRewardSummary: {
      asset: TokenAsset;
      amount: number;
    } | null;
    directRewardState: {
      label: string;
      tone: "info" | "success" | "warning";
    } | null;
    benchmarkNote: string;
    premiumNudge: string | null;
    returnAction: string | null;
    returnWindow: "today" | "this_week" | "wait_for_unlock";
    milestone: {
      label: string;
      tone: "info" | "success" | "warning";
    };
    questStatuses: Array<{
      questId: string;
      title: string;
      track: QuestTrack;
      cadence: "one-time" | "daily" | "weekly" | "monthly";
      verificationType: VerificationType;
      status: "available" | "in-progress" | "completed" | "rejected";
      actionable: boolean;
      gateLabel: string;
      dependencyDetail: string;
      dependencyProgressLabel: string;
      nextHint: string;
      rewardLabel: string;
      rewardTimingLabel: string;
    }>;
  }>;
  campaignNotifications: Array<{
    id: string;
    tone: "info" | "success" | "warning";
    title: string;
    detail: string;
    packId: string;
    reminderVariant?: string | null;
    reminderSchedule?: "today" | "this_week" | "wait_for_unlock";
    reminderScheduleLabel?: string | null;
    ctaLabel?: string;
    ctaQuestId?: string | null;
    ctaHref?: string | null;
    persistedState?: {
      status: "handled" | "snoozed";
      until?: string | null;
    } | null;
  }>;
  campaignPackHistory: Array<{
    packId: string;
    label: string;
    completedAt: string | null;
    totalQuestCount: number;
    attributionSource: CampaignSource | "direct";
    activeLane: CampaignSource | "direct";
    kind: "bridge" | "feeder" | "mixed";
    summary: string;
    totalXpAwarded: number;
    approvedQuestCount: number;
    premiumQuestCount: number;
    referralQuestCount: number;
  }>;
  quests: Quest[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  referralLeaderboard: LeaderboardEntry[];
  weeklyLeaderboard: LeaderboardEntry[];
  monthlyLeaderboard: LeaderboardEntry[];
  activityFeed: ActivityItem[];
  missionEventHistory: Array<{
    id: string;
    packId: string;
    packLabel: string;
    title: string;
    detail: string;
    timeAgo: string;
    createdAt: string;
  }>;
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
    attributionVsLane: Array<{
      attributionSource: CampaignSource | "unknown";
      activeLane: CampaignSource | "direct";
      userCount: number;
      monthlyCount: number;
      annualCount: number;
      premiumCount: number;
      conversionRate: number;
    }>;
    laneComparison: Array<{
      lane: CampaignSource | "direct";
      attributedUsers: number;
      activeUsers: number;
      monthlyCount: number;
      annualCount: number;
      premiumCount: number;
    }>;
    sourceQuality: Array<{
      source: CampaignSource | "unknown";
      activeLane: CampaignSource | "direct";
      invitedCount: number;
      convertedCount: number;
      monthlyCount: number;
      annualCount: number;
      premiumConversionRate: number;
      annualConversionRate: number;
    }>;
    laneQuality: Array<{
      lane: CampaignSource | "direct";
      invitedCount: number;
      convertedCount: number;
      monthlyCount: number;
      annualCount: number;
      premiumConversionRate: number;
      annualConversionRate: number;
    }>;
    bridgeComparison: Array<{
      source: CampaignSource | "unknown";
      activeLane: CampaignSource | "direct";
      invitedCount: number;
      convertedCount: number;
      sourcePremiumConversionRate: number;
      lanePremiumConversionRate: number;
      premiumConversionDelta: number;
      sourceAnnualConversionRate: number;
      laneAnnualConversionRate: number;
      annualConversionDelta: number;
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
  upstreamLanePreview: Array<{
    attributionSource: CampaignSource;
    activeLane: CampaignSource | "direct";
    differentiated: boolean;
    detail: string;
  }>;
  rewardAssets: RewardAsset[];
  rewardPrograms: RewardProgram[];
  tokenSettlementQueue: Array<TokenSettlementItem>;
  tokenSettlementAudit: Array<{
    id: string;
    redemptionId: string;
    action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
    previousWorkflowState: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
    nextWorkflowState: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
    changedByDisplayName: string | null;
    receiptReference: string | null;
    settlementNote: string | null;
    createdAt: string;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  settlementAnalytics: {
    periodDays: number;
    comparePeriodDays: number;
    periodLabel: string;
    comparePeriodLabel: string;
    pendingCount: number;
    pendingTokenAmount: number;
    oldestPendingHours: number;
    averageSettlementHours: number;
    settledLast7DaysCount: number;
    settledLast7DaysTokenAmount: number;
    previousSettledCount: number;
    previousSettledTokenAmount: number;
    previousRedemptionVelocityPerDay: number;
    settledCountDelta: number;
    settledTokenAmountDelta: number;
    velocityDelta: number;
    directRewardPendingCount: number;
    directRewardSettledCount: number;
    directRewardSettledTokenAmount: number;
    redemptionVelocityPerDay: number;
    workflowBreakdown: Array<{
      state: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
      count: number;
    }>;
    exceptionBreakdown: Array<{
      state: "held" | "failed" | "cancelled";
      count: number;
    }>;
    exceptionTrend: Array<{
      state: "held" | "failed" | "cancelled";
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    topFailureReasons: Array<{
      reason: string;
      count: number;
    }>;
    dailyThroughput: Array<{
      label: string;
      settledCount: number;
      settledTokenAmount: number;
    }>;
    byAsset: Array<{
      asset: TokenAsset;
      pendingCount: number;
      settledCount: number;
      totalTokenAmount: number;
    }>;
    byProgram: Array<{
      rewardProgramName: string;
      asset: TokenAsset;
      pendingCount: number;
      settledCount: number;
      totalTokenAmount: number;
    }>;
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
  questDefinitionTemplates?: Array<QuestDefinitionTemplateItem>;
  campaignOperations: {
    templateCounts: {
      total: number;
      bridge: number;
      feeder: number;
      active: number;
      generatedPacks: number;
      activeGeneratedPacks: number;
    };
    sourceTemplateCounts: Array<{
      source: CampaignSource;
      total: number;
      active: number;
    }>;
    missionCtaAnalytics: Array<{
      packId: string;
      label: string;
      activeLane: CampaignSource | "direct";
      eventType: string;
      ctaLabel: string;
      ctaVariant: string;
      clickCount: number;
      uniqueUserCount: number;
      lastClickedAt: string | null;
      weeklyTrend: Array<{
        bucketStart: string;
        clickCount: number;
      }>;
      walletLinkedUserCount: number;
      rewardEligibleUserCount: number;
      premiumUserCount: number;
      walletLinkRate: number;
      rewardEligibilityRate: number;
      premiumConversionRate: number;
      submitAttemptCount: number;
      submitAttemptUserCount: number;
      submitAttemptRate: number;
    }>;
    missionCtaByTier: Array<{
      packId: string;
      label: string;
      activeLane: CampaignSource | "direct";
      subscriptionTier: SubscriptionTier;
      eventType: string;
      ctaVariant: string;
      clickCount: number;
      uniqueUserCount: number;
      approvedCompletionCount: number;
      approvedUserCount: number;
      approvedUserRate: number;
    }>;
    returnWindowSummary: Array<{
      window: "today" | "this_week" | "wait_for_unlock";
      count: number;
    }>;
    returnWindowTrend: Array<{
      window: "today" | "this_week" | "wait_for_unlock";
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    missionInboxHistory: Array<{
      id: string;
      displayName: string;
      packId: string;
      packLabel: string;
      status: "handled" | "snoozed";
      until: string | null;
      detail: string;
      createdAt: string;
    }>;
    missionReminderStatusTrend: Array<{
      status: "handled" | "snoozed";
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    blockageSummary: Array<{
      state:
        | "wallet_connection"
        | "starter_path"
        | "level"
        | "trust"
        | "premium_phase"
        | "weekly_pace"
        | "ready";
      count: number;
    }>;
    blockageTrend: Array<{
      state:
        | "wallet_connection"
        | "starter_path"
        | "level"
        | "trust"
        | "premium_phase"
        | "weekly_pace"
        | "ready";
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    reminderVariantSummary: Array<{
      variant: string;
      handledCount: number;
      snoozedCount: number;
      handledRate: number;
    }>;
    reminderVariantTrend: Array<{
      variant: string;
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    reminderScheduleSummary: Array<{
      schedule: "today" | "this_week" | "wait_for_unlock";
      currentCount: number;
      previousCount: number;
      delta: number;
    }>;
    reminderVariantByBlockage: Array<{
      state:
        | "wallet_connection"
        | "starter_path"
        | "level"
        | "trust"
        | "premium_phase"
        | "weekly_pace"
        | "ready";
      variant: string;
      handledCount: number;
      snoozedCount: number;
    }>;
    reminderVariantScheduleSummary: Array<{
      variant: string;
      schedule: "today" | "this_week" | "wait_for_unlock";
      handledCount: number;
      snoozedCount: number;
    }>;
    blockageSuggestions: Array<{
      state:
        | "wallet_connection"
        | "starter_path"
        | "level"
        | "trust"
        | "premium_phase"
        | "weekly_pace"
        | "ready";
      title: string;
      detail: string;
    }>;
    packAnalytics: Array<{
      packId: string;
      label: string;
      lifecycleState: "draft" | "ready" | "live";
      questCount: number;
      activeQuestCount: number;
      bridgeCount: number;
      feederCount: number;
      sources: CampaignSource[];
      completionCount: number;
      approvedCompletionCount: number;
      participantCount: number;
      walletLinkedParticipantCount: number;
      walletLinkRate: number;
      firstTouchToWalletLinkCount: number;
      averageFirstTouchToWalletLinkDays: number | null;
      walletToPremiumCount: number;
      averageWalletToPremiumDays: number | null;
      starterPathCompleteCount: number;
      starterPathCompletionRate: number;
      rewardEligibleCount: number;
      rewardEligibilityRate: number;
      referralInviteCount: number;
      referralConvertedCount: number;
      referralConversionRate: number;
      postPackReferralInviteCount: number;
      postPackReferralConvertedCount: number;
      postPackReferralConversionRate: number;
      likelyPackCausedPremiumCount: number;
      likelyPackCausedPremiumConversionRate: number;
      retainedActiveCount: number;
      retainedActivityRate: number;
      averageWeeklyXp: number;
      engagedWeeklyXpCount: number;
      engagedWeeklyXpRate: number;
      premiumParticipantCount: number;
      annualParticipantCount: number;
      premiumConversionRate: number;
      premiumUpgradeCount: number;
      averagePremiumUpgradeDays: number | null;
      sourceBreakdown: Array<{
        attributionSource: CampaignSource;
        activeLane: CampaignSource;
        participantCount: number;
      }>;
      weeklyTrend: Array<{
        bucketStart: string;
        participantCount: number;
        completionCount: number;
      }>;
      benchmark: {
        activeLane: CampaignSource | "direct";
        walletLinkRateTarget: number;
        rewardEligibilityRateTarget: number;
        premiumConversionRateTarget: number;
        retainedActivityRateTarget: number;
        averageWeeklyXpTarget: number;
        zeroCompletionWeekThreshold: number;
        isOverridden: boolean;
        overrideReason: string | null;
        status: "on_track" | "mixed" | "off_track";
      };
      missionCtaSummary: {
        topCtaLabel: string | null;
        topCtaVariant: string | null;
        recommendedVariant: string | null;
        recommendedBadge: string | null;
        recommendedReason: string | null;
        recommendationHistory: Array<{
          action:
            | "create_pack"
            | "update_lifecycle"
            | "save_benchmark_override"
            | "clear_benchmark_override"
            | "suppress_alert"
            | "clear_alert_suppression";
          detail: string;
          changedByDisplayName: string | null;
          createdAt: string;
        }>;
        totalClicks: number;
        uniqueUsers: number;
        walletLinkedUsers: number;
        rewardEligibleUsers: number;
        premiumUsers: number;
        walletLinkRate: number;
        rewardEligibilityRate: number;
        premiumConversionRate: number;
        variantBreakdown: Array<{
          ctaVariant: string;
          ctaLabel: string | null;
          clickCount: number;
          uniqueUsers: number;
          approvedCompletionCount: number;
          approvedUserCount: number;
          approvedUserRate: number;
          tierBreakdown: Array<{
            subscriptionTier: SubscriptionTier;
            clickCount: number;
            approvedUserCount: number;
            approvedUserRate: number;
          }>;
          laneBreakdown: Array<{
            attributionSource: CampaignSource | "direct";
            activeLane: CampaignSource | "direct";
            uniqueUsers: number;
          }>;
        }>;
        variantComparison: Array<{
          variant: string;
          clickCount: number;
          approvedUserRate: number;
          walletLinkRate: number;
        }>;
      };
      createdAt: string;
      lastUpdatedAt: string;
      reminderEffectiveness: {
        handledCount: number;
        snoozedCount: number;
        totalCount: number;
        handledRate: number;
        trend: {
          currentCount: number;
          previousCount: number;
          delta: number;
        };
      };
      operatorNextMove: {
        title: string;
        detail: string;
      };
      operatorOutcome: {
        title: string;
        detail: string;
        trend: {
          currentCompletions: number;
          previousCompletions: number;
          currentParticipants: number;
          previousParticipants: number;
          completionDelta: number;
          participantDelta: number;
        };
      };
    }>;
    partnerReporting: Array<{
      packId: string;
      label: string;
      lifecycleState: "draft" | "ready" | "live";
      sources: CampaignSource[];
      benchmarkLane: CampaignSource | "direct";
      benchmarkStatus: "on_track" | "mixed" | "off_track";
      participantCount: number;
      approvedCompletionCount: number;
      walletLinkRate: number;
      rewardEligibilityRate: number;
      premiumConversionRate: number;
      likelyPackCausedPremiumConversionRate: number;
      averageWeeklyXp: number;
      completionTrendDelta: number;
      partnerSummaryHeadline: string;
      partnerSummaryDetail: string;
      operatorOutcomeTitle: string;
      operatorOutcomeDetail: string;
      lifecyclePhaseSummary: string;
      zeroCompletionRiskTrendSummary: string;
      benchmarkOverrideImpactSummary: string;
      benchmarkOverrideHistorySummary: string | null;
      lifecycleHistorySummary: string | null;
      recommendationHistorySnapshot: string[];
    }>;
    alerts: Array<{
      packId: string;
      label: string;
      severity: "warning" | "critical";
      title: string;
      detail: string;
    }>;
    notifications: Array<{
      channel: "inbox" | "webhook" | "email" | "slack" | "discord";
      enabled: boolean;
      status: "idle" | "armed";
      destination: string;
      title: string;
      detail: string;
    }>;
    notificationHistory: Array<{
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
    suppressions: Array<{
      id: string;
      packId: string;
      label: string;
      title: string;
      suppressedUntil: string;
      reason: string | null;
      createdAt: string;
      createdByDisplayName: string | null;
      clearedAt: string | null;
      clearedByDisplayName: string | null;
    }>;
    suppressionAnalytics: {
      activeCount: number;
      activeByDurationHours: Array<{
        hours: number;
        count: number;
      }>;
      activeByReason: Array<{
        reason: string;
        count: number;
      }>;
      recentActivity: Array<{
        bucketStart: string;
        suppressionCount: number;
        clearedCount: number;
        acknowledgedCount: number;
      }>;
    };
    audit: Array<{
      id: string;
      packId: string;
      label: string;
      action:
        | "create_pack"
        | "update_lifecycle"
        | "save_benchmark_override"
        | "clear_benchmark_override"
        | "suppress_alert"
        | "clear_alert_suppression";
      detail: string;
      changedByDisplayName: string | null;
      createdAt: string;
    }>;
    packReady: boolean;
    activeLaneMode: "bridged" | "separate";
  };
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
  | { type: "min_streak"; value: number }
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
  | { type: "campaign_source"; value: "direct" | "zealy" | "galxe" | "taskon" }
  | { type: "trust_score_band"; value: Exclude<TrustScoreBand, "low"> }
  | { type: "wallet_age_days"; value: number }
  | { type: "quest_completed"; value: string }
  | { type: "quest_completed_today"; value: string }
  | { type: "weekly_xp_min"; value: number }
  | {
      type: "runtime_flag";
      value: "flashRewardDay" | "referralBoostWeek" | "milestone_share_enabled";
    };

export type UnlockRuleGroup = {
  all?: UnlockRule[];
  any?: UnlockRule[];
};

export type QuestUnlockRequirement = UnlockRule & {
  prerequisiteTitle?: string;
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

export type CampaignAlertChannelConfig = {
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

export type PayoutOperationsMode = "manual" | "review_required" | "automation_ready";

export type CampaignEconomyOverride = {
  signupBonusXp: number;
  monthlyConversionBonusXp: number;
  annualConversionBonusXp: number;
  annualDirectTokenBonus: number;
  questXpMultiplierBonus: number;
  eligibilityPointsMultiplierBonus: number;
  tokenYieldMultiplierBonus: number;
  minimumEligibilityPointsOffset: number;
  directTokenRewardBonus: number;
  weeklyTargetXpOffset: number;
  premiumUpsellBonusMultiplier: number;
  leaderboardMomentumBonus: number;
};

export type CampaignPackBenchmarkConfig = {
  walletLinkRateTarget: number;
  rewardEligibilityRateTarget: number;
  premiumConversionRateTarget: number;
  retainedActivityRateTarget: number;
  averageWeeklyXpTarget: number;
  zeroCompletionWeekThreshold: number;
};

export type CampaignPackBenchmarkOverride = CampaignPackBenchmarkConfig & {
  packId: string;
  label: string;
  reason: string | null;
  updatedAt: string;
  updatedByDisplayName: string | null;
};

export type EconomySettings = {
  id: string;
  publishedBrandTheme: "emorya" | "multiversx" | "xportal";
  payoutAsset: TokenAsset;
  payoutMode: PayoutOperationsMode;
  redemptionEnabled: boolean;
  settlementProcessingEnabled: boolean;
  directRewardQueueEnabled: boolean;
  settlementNotesRequired: boolean;
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
  differentiateUpstreamCampaignSources: boolean;
  campaignOverrides: Record<CampaignSource, CampaignEconomyOverride>;
  campaignPackBenchmarks: Record<CampaignSource | "direct", CampaignPackBenchmarkConfig>;
  campaignAlertChannels: CampaignAlertChannelConfig;
  updatedAt: string;
};

export type EconomySettingsAuditEntry = {
  id: string;
  changedByDisplayName: string | null;
  createdAt: string;
  summary: string;
};

export type RewardAsset = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl: string | null;
  issuerName: string | null;
  isActive: boolean;
  isPartnerAsset: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RewardProgram = {
  id: string;
  slug: string;
  name: string;
  rewardAssetId: string;
  assetSymbol: string;
  assetName: string;
  isActive: boolean;
  redemptionEnabled: boolean;
  directRewardsEnabled: boolean;
  referralRewardsEnabled: boolean;
  premiumRewardsEnabled: boolean;
  ambassadorRewardsEnabled: boolean;
  minimumEligibilityPoints: number;
  pointsPerToken: number;
  notes: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  completedQuestSlugsToday: string[];
  ambassadorCandidate: boolean;
  ambassadorActive: boolean;
  campaignSource: CampaignSource | null;
};

export type QuestRuntimeContext = {
  now: string;
  activeCampaignSlugs: string[];
  flashRewardDay: boolean;
  referralBoostWeek: boolean;
  milestone_share_enabled: boolean;
};

export type EvaluatedQuest = {
  id: string;
  title: string;
  track: QuestTrack;
  launchOrder?: number;
  status: "active" | "locked" | "completed" | "in_progress" | "cooldown" | "rejected";
  visible: boolean;
  lockedReason: string | null;
  unlockHint: string | null;
  unmetRules: UnlockRule[];
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
  adminReviewNote?: string | null;
  userDisplayName: string;
  userEmail: string | null;
  verificationType: VerificationType;
  submissionData: Record<string, unknown>;
  status: CompletionStatus;
  createdAt: string;
};

export type ReviewHistoryItem = {
  id: string;
  questId: string;
  questTitle: string;
  adminReviewNote?: string | null;
  userDisplayName: string;
  userEmail: string | null;
  reviewerDisplayName: string | null;
  verificationType: VerificationType;
  submissionData: Record<string, unknown>;
  status: Extract<CompletionStatus, "approved" | "rejected">;
  awardedXp: number;
  reviewedAt: string;
};

export type ManualReviewSubmission = {
  contentUrl: string;
  screenshotUrl: string | null;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  proofFileType?: string | null;
  platform: string | null;
  note: string | null;
  profileUrl?: string | null;
  sharedAt?: string | null;
  taskSubmissions?: QuestTaskSubmission[];
  submittedAt: string;
  moderationNote?: string | null;
  moderatedAt?: string | null;
};

export type TextSubmission = {
  response: string;
  referenceUrl?: string | null;
  platform?: string | null;
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
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  requiredTier: SubscriptionTier;
  requiredLevel: number;
  xpReward: number;
  isPremiumPreview: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type QuestDefinitionTemplateItem = {
  id: string;
  label: string;
  description: string;
  form: {
    category: QuestCategory;
    difficulty: "easy" | "medium" | "hard";
    verificationType: VerificationType;
    recurrence: "one-time" | "daily" | "weekly" | "monthly";
    requiredTier: SubscriptionTier;
    requiredLevel: number;
    xpReward: number;
    isPremiumPreview: boolean;
    isActive: boolean;
  };
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TokenSettlementItem = {
  id: string;
  userDisplayName: string;
  userEmail: string | null;
  asset: TokenAsset;
  assetName?: string | null;
  rewardAssetId: string | null;
  rewardProgramId: string | null;
  rewardProgramName: string | null;
  tokenAmount: number;
  eligibilityPointsSpent: number;
  source: string;
  workflowState: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
  createdAt: string;
  approvedAt: string | null;
  approvedByDisplayName: string | null;
  processingStartedAt: string | null;
  processingByDisplayName: string | null;
  heldAt: string | null;
  heldByDisplayName: string | null;
  holdReason: string | null;
  failedAt: string | null;
  failedByDisplayName: string | null;
  lastError: string | null;
  cancelledAt: string | null;
  cancelledByDisplayName: string | null;
  cancellationReason: string | null;
  retryCount: number;
  updatedAt: string;
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
