import assert from "node:assert/strict";
import test from "node:test";

import { defaultEconomySettings } from "../lib/economy-settings.ts";
import {
  calculateReferralRewardState,
  getReferralRewardTargets,
} from "../server/services/referral-rules.ts";

test("getReferralRewardTargets bridges taskon into zealy by default", () => {
  const zealyMonthly = getReferralRewardTargets({
    subscriptionTier: "monthly",
    campaignSource: "zealy",
  });
  const taskonAnnual = getReferralRewardTargets({
    subscriptionTier: "annual",
    campaignSource: "taskon",
  });

  assert.equal(zealyMonthly.signupXp, 50);
  assert.equal(zealyMonthly.conversionXp, 170);
  assert.equal(taskonAnnual.conversionXp, 340);
  assert.equal(taskonAnnual.annualDirectTokenReward, 30);
});

test("getReferralRewardTargets respects configured campaign overrides", () => {
  const overridden = getReferralRewardTargets({
    subscriptionTier: "annual",
    campaignSource: "galxe",
    settings: {
      ...defaultEconomySettings,
      differentiateUpstreamCampaignSources: true,
      campaignOverrides: {
        ...defaultEconomySettings.campaignOverrides,
        galxe: {
          ...defaultEconomySettings.campaignOverrides.galxe,
          signupBonusXp: 12,
          monthlyConversionBonusXp: 44,
          annualConversionBonusXp: 88,
          annualDirectTokenBonus: 9,
        },
      },
    },
  });

  assert.equal(overridden.signupXp, 52);
  assert.equal(overridden.conversionXp, 388);
  assert.equal(overridden.annualDirectTokenReward, 34);
});

test("getReferralRewardTargets can differentiate upstream platforms when enabled", () => {
  const differentiated = getReferralRewardTargets({
    subscriptionTier: "annual",
    campaignSource: "taskon",
    settings: {
      ...defaultEconomySettings,
      differentiateUpstreamCampaignSources: true,
    },
  });

  assert.equal(differentiated.conversionXp, 370);
  assert.equal(differentiated.annualDirectTokenReward, 35);
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
        refereeCampaignSource: "taskon",
        signupRewardXp: 40,
        conversionRewardXp: 150,
      },
    ],
  });

  assert.equal(rewardState.updates[0]?.signupRewardXp, 50);
  assert.equal(rewardState.updates[0]?.conversionRewardXp, 170);
  assert.equal(rewardState.updates[1]?.conversionRewardXp, 340);
  assert.equal(rewardState.updates[1]?.directTokenReward, 30);
  assert.ok(rewardState.totalXp > 1000);
});
