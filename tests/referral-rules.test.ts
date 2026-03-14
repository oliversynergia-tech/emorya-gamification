import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateReferralRewardState,
  getReferralRewardTargets,
} from "../server/services/referral-rules.ts";

test("getReferralRewardTargets applies campaign-source bonuses", () => {
  const zealyMonthly = getReferralRewardTargets({
    subscriptionTier: "monthly",
    campaignSource: "zealy",
  });
  const layer3Annual = getReferralRewardTargets({
    subscriptionTier: "annual",
    campaignSource: "layer3",
  });

  assert.equal(zealyMonthly.signupXp, 50);
  assert.equal(zealyMonthly.conversionXp, 170);
  assert.equal(layer3Annual.conversionXp, 370);
  assert.equal(layer3Annual.annualDirectTokenReward, 35);
});

test("calculateReferralRewardState uses subscription tier and campaign source", () => {
  const rewardState = calculateReferralRewardState({
    totalXp: 1000,
    level: 6,
    referrals: [
      {
        id: "ref-1",
        refereeDisplayName: "Nova",
        refereeSubscriptionTier: "monthly",
        refereeCampaignSource: "galxe",
        signupRewardXp: 0,
        conversionRewardXp: 0,
      },
      {
        id: "ref-2",
        refereeDisplayName: "Lyra",
        refereeSubscriptionTier: "annual",
        refereeCampaignSource: "layer3",
        signupRewardXp: 40,
        conversionRewardXp: 150,
      },
    ],
  });

  assert.equal(rewardState.updates[0]?.signupRewardXp, 45);
  assert.equal(rewardState.updates[0]?.conversionRewardXp, 180);
  assert.equal(rewardState.updates[1]?.conversionRewardXp, 370);
  assert.equal(rewardState.updates[1]?.directTokenReward, 35);
  assert.ok(rewardState.totalXp > 1000);
});
