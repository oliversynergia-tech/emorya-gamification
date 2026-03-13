import assert from "node:assert/strict";
import test from "node:test";

import { deriveUserProgressState } from "../server/services/user-progress-state.ts";
import { resolveUserJourneyState } from "../server/services/user-journey-state.ts";

test("deriveUserProgressState marks starter path and reward eligibility when thresholds pass", () => {
  const state = deriveUserProgressState({
    userId: "user-1",
    level: 5,
    totalXp: 760,
    currentStreak: 3,
    weeklyXp: 240,
    walletLinked: true,
    walletAgeDays: 5,
    subscriptionTier: "free",
    connectedSocials: ["X"],
    successfulReferralCount: 2,
    monthlyPremiumReferralCount: 0,
    annualPremiumReferralCount: 0,
    approvedQuests: [
      {
        slug: "starter-first-step",
        category: "social",
        verificationType: "social-oauth",
        requiredLevel: 1,
        isPremiumPreview: false,
      },
      {
        slug: "visit-premium-explainer",
        category: "learn",
        verificationType: "link-visit",
        requiredLevel: 1,
        isPremiumPreview: false,
      },
      {
        slug: "log-8000-steps",
        category: "app",
        verificationType: "manual-review",
        requiredLevel: 3,
        isPremiumPreview: false,
      },
    ],
    campaignSource: "zealy",
  });

  assert.equal(state.starterPathComplete, true);
  assert.equal(state.rewardEligible, true);
  assert.equal(state.trustScoreBand, "medium");
  assert.equal(resolveUserJourneyState(state), "reward_eligible_free");
});

test("deriveUserProgressState keeps low-friction users below starter path", () => {
  const state = deriveUserProgressState({
    userId: "user-2",
    level: 2,
    totalXp: 180,
    currentStreak: 1,
    weeklyXp: 60,
    walletLinked: false,
    walletAgeDays: 0,
    subscriptionTier: "free",
    connectedSocials: [],
    successfulReferralCount: 0,
    monthlyPremiumReferralCount: 0,
    annualPremiumReferralCount: 0,
    approvedQuests: [
      {
        slug: "visit-premium-explainer",
        category: "learn",
        verificationType: "link-visit",
        requiredLevel: 1,
        isPremiumPreview: false,
      },
    ],
    campaignSource: null,
  });

  assert.equal(state.starterPathComplete, false);
  assert.equal(state.rewardEligible, false);
  assert.equal(resolveUserJourneyState(state), "signed_up_free");
});

test("resolveUserJourneyState prioritizes ambassador and premium tiers", () => {
  const state = deriveUserProgressState({
    userId: "user-3",
    level: 12,
    totalXp: 4200,
    currentStreak: 8,
    weeklyXp: 620,
    walletLinked: true,
    walletAgeDays: 30,
    subscriptionTier: "annual",
    connectedSocials: ["X", "Telegram", "Discord"],
    successfulReferralCount: 12,
    monthlyPremiumReferralCount: 2,
    annualPremiumReferralCount: 1,
    approvedQuests: [
      {
        slug: "log-8000-steps",
        category: "app",
        verificationType: "manual-review",
        requiredLevel: 3,
        isPremiumPreview: false,
      },
      {
        slug: "visit-premium-explainer",
        category: "learn",
        verificationType: "link-visit",
        requiredLevel: 1,
        isPremiumPreview: false,
      },
      {
        slug: "starter-first-step",
        category: "social",
        verificationType: "social-oauth",
        requiredLevel: 1,
        isPremiumPreview: false,
      },
    ],
    campaignSource: "direct",
    ambassadorActive: true,
  });

  assert.equal(state.ambassadorCandidate, true);
  assert.equal(resolveUserJourneyState(state), "ambassador");
});
