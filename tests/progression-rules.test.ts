import test from "node:test";
import assert from "node:assert/strict";

import { defaultEconomySettings } from "../lib/economy-settings.ts";
import { calculateQuestRewardTransition } from "../server/services/progression-rules.ts";

test("calculateQuestRewardTransition applies premium multipliers, levels up, and advances streaks", () => {
  const result = calculateQuestRewardTransition({
    subscriptionTier: "monthly",
    questXpReward: 100,
    previousAwardedXp: 0,
    totalXp: 90,
    level: 1,
    currentStreak: 2,
    longestStreak: 3,
    shouldBeApproved: true,
    alreadyApprovedToday: false,
  });

  assert.deepEqual(result, {
    xpAwarded: 125,
    deltaXp: 125,
    totalXp: 215,
    level: 2,
    currentStreak: 3,
    longestStreak: 3,
  });
});

test("calculateQuestRewardTransition remains idempotent when approval was already credited", () => {
  const result = calculateQuestRewardTransition({
    subscriptionTier: "annual",
    questXpReward: 80,
    previousAwardedXp: 120,
    totalXp: 520,
    level: 4,
    currentStreak: 5,
    longestStreak: 5,
    shouldBeApproved: true,
    alreadyApprovedToday: true,
  });

  assert.deepEqual(result, {
    xpAwarded: 120,
    deltaXp: 0,
    totalXp: 520,
    level: 4,
    currentStreak: 5,
    longestStreak: 5,
  });
});

test("calculateQuestRewardTransition applies campaign-source quest XP bonuses", () => {
  const result = calculateQuestRewardTransition({
    subscriptionTier: "free",
    questXpReward: 100,
    previousAwardedXp: 0,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    shouldBeApproved: true,
    alreadyApprovedToday: false,
    campaignSource: "zealy",
    settings: defaultEconomySettings,
  });

  assert.deepEqual(result, {
    xpAwarded: 105,
    deltaXp: 105,
    totalXp: 105,
    level: 2,
    currentStreak: 1,
    longestStreak: 1,
  });
});
