import test from "node:test";
import assert from "node:assert/strict";

import {
  REFERRAL_CONVERSION_REWARD_XP,
  REFERRAL_SIGNUP_REWARD_XP,
  calculateReferralRewardState,
} from "../server/services/referral-rules.ts";

test("calculateReferralRewardState awards signup and conversion XP and updates level", () => {
  const result = calculateReferralRewardState({
    totalXp: 90,
    level: 1,
    referrals: [
      {
        id: "ref-1",
        refereeDisplayName: "Nova",
        refereeSubscribed: true,
        signupRewardXp: 0,
        conversionRewardXp: 0,
      },
    ],
  });

  assert.equal(result.totalXp, 90 + REFERRAL_SIGNUP_REWARD_XP + REFERRAL_CONVERSION_REWARD_XP);
  assert.equal(result.level, 2);
  assert.deepEqual(result.updates, [
    {
      id: "ref-1",
      signupRewardXp: REFERRAL_SIGNUP_REWARD_XP,
      conversionRewardXp: REFERRAL_CONVERSION_REWARD_XP,
      deltaXp: 160,
    },
  ]);
});

test("calculateReferralRewardState stays idempotent when rewards were already granted", () => {
  const result = calculateReferralRewardState({
    totalXp: 800,
    level: 4,
    referrals: [
      {
        id: "ref-2",
        refereeDisplayName: "Lyra",
        refereeSubscribed: true,
        signupRewardXp: REFERRAL_SIGNUP_REWARD_XP,
        conversionRewardXp: REFERRAL_CONVERSION_REWARD_XP,
      },
    ],
  });

  assert.equal(result.totalXp, 800);
  assert.equal(result.level, 4);
  assert.deepEqual(result.updates, [
    {
      id: "ref-2",
      signupRewardXp: REFERRAL_SIGNUP_REWARD_XP,
      conversionRewardXp: REFERRAL_CONVERSION_REWARD_XP,
      deltaXp: 0,
    },
  ]);
});
