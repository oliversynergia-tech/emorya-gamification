import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardQuestBoard } from "../server/services/build-dashboard-quest-board.ts";

const baseUserState = {
  userId: "user-1",
  level: 4,
  totalXp: 520,
  currentStreak: 4,
  weeklyXp: 180,
  starterPathComplete: true,
  rewardEligible: false,
  walletLinked: true,
  walletAgeDays: 7,
  trustScoreBand: "medium" as const,
  subscriptionTier: "free" as const,
  connectedSocials: ["X", "Telegram"],
  successfulReferralCount: 1,
  monthlyPremiumReferralCount: 0,
  annualPremiumReferralCount: 0,
  connectedSocialCount: 2,
  approvedQuestCount: 4,
  starterQuestCount: 3,
  wellnessQuestCount: 1,
  socialQuestCount: 2,
  completedQuestSlugs: ["create-emorya-account"],
  completedQuestSlugsToday: [],
  ambassadorCandidate: false,
  ambassadorActive: false,
  campaignSource: "zealy" as const,
};

test("buildDashboardQuestBoard returns a mixed active board with locked previews", () => {
  const quests = [
    {
      id: "starter-1",
      slug: "create-emorya-account",
      title: "Welcome setup",
      description: "Starter",
      category: "app" as const,
      xp_reward: 30,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "one-time" as const,
      metadata: { track: "starter", targetUrl: "https://example.com" },
      completion_status: null,
    },
    {
      id: "daily-1",
      slug: "play-emoryan-adventure-game",
      title: "Adventure game",
      description: "Daily",
      category: "app" as const,
      xp_reward: 28,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "daily" as const,
      metadata: { track: "daily", targetUrl: "https://example.com" },
      completion_status: null,
    },
    {
      id: "social-1",
      slug: "share-the-movement-reset",
      title: "Share your Emorya progress",
      description: "Social",
      category: "social" as const,
      xp_reward: 30,
      difficulty: "easy" as const,
      verification_type: "social-oauth" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "daily" as const,
      metadata: { track: "social" },
      completion_status: null,
    },
    {
      id: "wallet-1",
      slug: "wallet-track",
      title: "Wallet track",
      description: "Wallet",
      category: "staking" as const,
      xp_reward: 75,
      difficulty: "medium" as const,
      verification_type: "wallet-check" as const,
      required_level: 4,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "wallet", unlockRules: { all: [{ type: "wallet_linked", value: true }] } },
      completion_status: null,
    },
    {
      id: "referral-1",
      slug: "three-friend-momentum-push",
      title: "Referral push",
      description: "Referral",
      category: "referral" as const,
      xp_reward: 95,
      difficulty: "medium" as const,
      verification_type: "link-visit" as const,
      required_level: 4,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "referral", unlockRules: { all: [{ type: "successful_referrals", value: 1 }] } },
      completion_status: null,
    },
    {
      id: "campaign-zealy",
      slug: "zealy-bridge-sprint",
      title: "Zealy bridge",
      description: "Campaign",
      category: "limited" as const,
      xp_reward: 85,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 3,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "campaign", unlockRules: { all: [{ type: "campaign_source", value: "zealy" }] } },
      completion_status: null,
    },
    {
      id: "premium-locked",
      slug: "monthly-momentum-sprint",
      title: "Premium locked",
      description: "Premium",
      category: "limited" as const,
      xp_reward: 110,
      difficulty: "medium" as const,
      verification_type: "link-visit" as const,
      required_level: 5,
      required_tier: "monthly" as const,
      is_premium_preview: true,
      recurrence: "weekly" as const,
      metadata: { track: "premium" },
      completion_status: null,
    },
  ];

  const board = buildDashboardQuestBoard({
    quests,
    userProgressState: baseUserState,
    journeyState: "activated_free",
  });

  assert.ok(board.some((quest) => quest.track === "wallet"));
  assert.ok(board.some((quest) => quest.track === "campaign"));
  assert.ok(board.some((quest) => quest.status === "locked" && quest.track === "premium"));
});

test("buildDashboardQuestBoard filters emorya-only and brand-scoped quests for partner skins", () => {
  const quests = [
    {
      id: "emorya-only",
      slug: "create-emorya-account",
      title: "Create Emorya account",
      description: "Starter",
      category: "app" as const,
      xp_reward: 30,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "one-time" as const,
      metadata: { track: "starter", questPortability: "emorya_only" },
      completion_status: null,
    },
    {
      id: "xportal-wallet",
      slug: "connect-your-xportal-wallet",
      title: "Connect your XPortal Wallet",
      description: "Wallet",
      category: "app" as const,
      xp_reward: 40,
      difficulty: "easy" as const,
      verification_type: "wallet-check" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "one-time" as const,
      metadata: { track: "wallet", questPortability: "portable_adapt", brandThemes: ["emorya", "xportal"] },
      completion_status: null,
    },
    {
      id: "portable",
      slug: "generic-portable-quest",
      title: "Generic portable quest",
      description: "Starter",
      category: "app" as const,
      xp_reward: 20,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 1,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "one-time" as const,
      metadata: { track: "starter", questPortability: "core_portable", targetUrl: "https://example.com" },
      completion_status: null,
    },
  ];

  const multiversxBoard = buildDashboardQuestBoard({
    quests,
    userProgressState: baseUserState,
    journeyState: "activated_free",
    runtimeBrandThemeId: "multiversx",
  });

  assert.equal(multiversxBoard.some((quest) => quest.title === "Create Emorya account"), false);
  assert.equal(multiversxBoard.some((quest) => quest.title === "Connect your XPortal Wallet"), false);
  assert.equal(multiversxBoard.some((quest) => quest.title === "Generic portable quest"), true);

  const xportalBoard = buildDashboardQuestBoard({
    quests,
    userProgressState: baseUserState,
    journeyState: "activated_free",
    runtimeBrandThemeId: "xportal",
  });

  assert.equal(xportalBoard.some((quest) => quest.title === "Create Emorya account"), false);
  assert.equal(xportalBoard.some((quest) => quest.title === "Connect your XPortal Wallet"), true);
});

test("buildDashboardQuestBoard hides campaign quests from mismatched attribution sources", () => {
  const quests = [
    {
      id: "campaign-galxe",
      slug: "galxe-migration-loop",
      title: "Galxe migration loop",
      description: "Galxe campaign",
      category: "limited" as const,
      xp_reward: 90,
      difficulty: "medium" as const,
      verification_type: "link-visit" as const,
      required_level: 3,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "campaign", unlockRules: { all: [{ type: "campaign_source", value: "galxe" }] } },
      completion_status: null,
    },
    {
      id: "campaign-zealy",
      slug: "zealy-bridge-sprint",
      title: "Zealy bridge sprint",
      description: "Zealy campaign",
      category: "limited" as const,
      xp_reward: 85,
      difficulty: "easy" as const,
      verification_type: "link-visit" as const,
      required_level: 3,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "campaign", unlockRules: { all: [{ type: "campaign_source", value: "zealy" }] } },
      completion_status: null,
    },
    {
      id: "campaign-taskon",
      slug: "taskon-conversion-lane",
      title: "TaskOn conversion lane",
      description: "TaskOn campaign",
      category: "limited" as const,
      xp_reward: 90,
      difficulty: "medium" as const,
      verification_type: "link-visit" as const,
      required_level: 3,
      required_tier: "free" as const,
      is_premium_preview: false,
      recurrence: "weekly" as const,
      metadata: { track: "campaign", unlockRules: { all: [{ type: "campaign_source", value: "taskon" }] } },
      completion_status: null,
    },
  ];

  const galxeBoard = buildDashboardQuestBoard({
    quests,
    userProgressState: {
      ...baseUserState,
      campaignSource: "galxe",
    },
    journeyState: "signed_up_free",
  });

  assert.equal(galxeBoard.some((quest) => quest.title === "Galxe migration loop"), true);
  assert.equal(galxeBoard.some((quest) => quest.title === "Zealy bridge sprint"), false);
  assert.equal(galxeBoard.some((quest) => quest.title === "TaskOn conversion lane"), false);
});
