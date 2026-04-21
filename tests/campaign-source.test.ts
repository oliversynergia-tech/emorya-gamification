import assert from "node:assert/strict";
import test from "node:test";

import { getCampaignPremiumJourney, getCampaignSourceProfile } from "../lib/campaign-source.ts";

test("getCampaignPremiumJourney recommends annual first for taskon lanes", () => {
  const journey = getCampaignPremiumJourney("taskon", {
    featuredTracks: ["premium", "wallet", "campaign"],
    premiumUpsellMultiplier: 1.12,
    weeklyTargetOffset: 35,
  });

  assert.equal(journey.recommendedTier, "annual");
  assert.match(journey.lanePressure, /premium, wallet, campaign/);
  assert.doesNotMatch(journey.lanePressure, /\+35 XP/);
  assert.match(journey.lanePressure, /deeper path/);
});

test("getCampaignPremiumJourney recommends monthly first for zealy lanes", () => {
  const journey = getCampaignPremiumJourney("zealy", {
    featuredTracks: ["campaign", "wallet", "premium"],
    premiumUpsellMultiplier: 1.08,
    weeklyTargetOffset: 20,
  });

  assert.equal(journey.recommendedTier, "monthly");
  assert.equal(journey.pathSteps.length, 3);
});

test("default campaign source profile stays brand-safe for partner skins", () => {
  const profile = getCampaignSourceProfile("direct");

  assert.doesNotMatch(profile.title, /Emorya/i);
  assert.doesNotMatch(profile.description, /Emorya/i);
});
