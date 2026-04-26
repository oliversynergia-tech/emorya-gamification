import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultQuestRuntimeContext } from "../lib/progression-rules.ts";
import { evaluateUnlockRuleGroup, getUnmetUnlockRules } from "../server/services/evaluate-unlock-rules.ts";
import { generateUnlockHint } from "../server/services/generate-unlock-hint.ts";

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
  completedQuestSlugsToday: ["log-todays-calorie-burn"],
  ambassadorCandidate: false,
  ambassadorActive: false,
  campaignSource: "zealy" as const,
};

test("evaluateUnlockRuleGroup unlocks quests when all rules pass", () => {
  const result = evaluateUnlockRuleGroup(
    {
      all: [
        { type: "min_level", value: 5 },
        { type: "min_streak", value: 3 },
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
        { type: "runtime_flag", value: "milestone_share_enabled" },
      ],
    },
    baseState,
    {
      ...createDefaultQuestRuntimeContext(),
      milestone_share_enabled: true,
    },
  );

  assert.equal(result.unlocked, true);
});

test("generateUnlockHint explains milestone share runtime gates", () => {
  const hint = generateUnlockHint([{ type: "runtime_flag", value: "milestone_share_enabled" }]);

  assert.equal(hint, "Available while milestone sharing is live");
});

test("generateUnlockHint explains campaign-source gates clearly", () => {
  const hint = generateUnlockHint([{ type: "campaign_source", value: "galxe" }]);

  assert.equal(hint, "Available to galxe campaign entrants");
});

test("evaluateUnlockRuleGroup enforces minimum streak requirements", () => {
  const lockedResult = evaluateUnlockRuleGroup(
    {
      all: [{ type: "min_streak", value: 4 }],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.equal(lockedResult.unlocked, false);
  assert.deepEqual(lockedResult.unmetAll, [{ type: "min_streak", value: 4 }]);

  const unlockedResult = evaluateUnlockRuleGroup(
    {
      all: [{ type: "min_streak", value: 3 }],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.equal(unlockedResult.unlocked, true);
});

test("evaluateUnlockRuleGroup enforces quest completion on the current UTC day", () => {
  const lockedResult = evaluateUnlockRuleGroup(
    {
      all: [{ type: "quest_completed_today", value: "complete-daily-wheel-spin" }],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.equal(lockedResult.unlocked, false);
  assert.deepEqual(lockedResult.unmetAll, [{ type: "quest_completed_today", value: "complete-daily-wheel-spin" }]);

  const unlockedResult = evaluateUnlockRuleGroup(
    {
      all: [{ type: "quest_completed_today", value: "log-todays-calorie-burn" }],
    },
    baseState,
    createDefaultQuestRuntimeContext(),
  );

  assert.equal(unlockedResult.unlocked, true);
});
