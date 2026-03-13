import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultQuestRuntimeContext } from "../lib/progression-rules.ts";
import { evaluateUnlockRuleGroup, getUnmetUnlockRules } from "../server/services/evaluate-unlock-rules.ts";

const baseState = {
  userId: "user-1",
  level: 6,
  totalXp: 900,
  currentStreak: 3,
  weeklyXp: 280,
  starterPathComplete: true,
  rewardEligible: true,
  walletLinked: true,
  walletAgeDays: 9,
  trustScoreBand: "medium" as const,
  subscriptionTier: "monthly" as const,
  connectedSocials: ["X", "Telegram"],
  successfulReferralCount: 4,
  monthlyPremiumReferralCount: 1,
  annualPremiumReferralCount: 0,
  connectedSocialCount: 2,
  approvedQuestCount: 5,
  starterQuestCount: 4,
  wellnessQuestCount: 1,
  socialQuestCount: 2,
  completedQuestSlugs: ["connect-xportal", "visit-premium-explainer"],
  ambassadorCandidate: false,
  ambassadorActive: false,
  campaignSource: "zealy" as const,
};

test("evaluateUnlockRuleGroup unlocks quests when all rules pass", () => {
  const result = evaluateUnlockRuleGroup(
    {
      all: [
        { type: "min_level", value: 5 },
        { type: "wallet_linked", value: true },
        { type: "subscription_tier", value: "monthly" },
      ],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.equal(result.unlocked, true);
  assert.deepEqual(result.unmetAll, []);
});

test("getUnmetUnlockRules returns failing rules for hints", () => {
  const result = getUnmetUnlockRules(
    {
      all: [
        { type: "annual_premium_referrals", value: 1 },
        { type: "wallet_age_days", value: 14 },
      ],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.deepEqual(result.unmetAll, [
    { type: "annual_premium_referrals", value: 1 },
    { type: "wallet_age_days", value: 14 },
  ]);
});

test("evaluateUnlockRuleGroup supports runtime flags through any-rules", () => {
  const result = evaluateUnlockRuleGroup(
    {
      any: [
        { type: "runtime_flag", value: "flashRewardDay" },
        { type: "runtime_flag", value: "referralBoostWeek" },
      ],
    },
    baseState,
    {
      ...createDefaultQuestRuntimeContext(),
      referralBoostWeek: true,
    },
  );

  assert.equal(result.unlocked, true);
});
