import assert from "node:assert/strict";
import test from "node:test";

import { selectQuestBoard } from "../server/services/select-quest-board.ts";

test("selectQuestBoard caps locked previews and prioritizes recommended active quests", () => {
  const quests = [
    {
      id: "starter-1",
      title: "Starter",
      track: "starter" as const,
      status: "active" as const,
      visible: true,
      lockedReason: null,
      unlockHint: null,
      projectedReward: {
        xp: 25,
        tokenEffect: "none" as const,
      },
      sortScore: 1200,
    },
    {
      id: "wallet-1",
      title: "Wallet",
      track: "wallet" as const,
      status: "active" as const,
      visible: true,
      lockedReason: null,
      unlockHint: null,
      projectedReward: {
        xp: 80,
        tokenEffect: "eligibility_progress" as const,
      },
      sortScore: 500,
    },
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `locked-${index}`,
      title: `Locked ${index}`,
      track: "premium" as const,
      status: "locked" as const,
      visible: true,
      lockedReason: "Requirements not met yet.",
      unlockHint: "Upgrade to Monthly Premium",
      projectedReward: {
        xp: 100 - index,
        tokenEffect: "eligibility_progress" as const,
      },
      sortScore: 200 - index,
    })),
  ];

  const result = selectQuestBoard({
    quests,
    journeyState: "signed_up_free",
    campaignSource: null,
  });

  assert.equal(result.active[0]?.id, "starter-1");
  assert.equal(result.lockedPreviews.length, 5);
  assert.equal(result.quests.length, 7);
});

test("selectQuestBoard promotes campaign quests for sourced onboarding ladders", () => {
  const result = selectQuestBoard({
    quests: [
      {
        id: "campaign-1",
        title: "Zealy bridge",
        track: "campaign" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: {
          xp: 90,
          tokenEffect: "eligibility_progress" as const,
        },
        sortScore: 900,
      },
      {
        id: "social-1",
        title: "Social",
        track: "social" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: {
          xp: 35,
          tokenEffect: "none" as const,
        },
        sortScore: 850,
      },
      {
        id: "starter-1",
        title: "Starter",
        track: "starter" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: {
          xp: 25,
          tokenEffect: "none" as const,
        },
        sortScore: 1000,
      },
    ],
    journeyState: "signed_up_free",
    campaignSource: "zealy",
  });

  assert.deepEqual(
    result.active.slice(0, 2).map((quest) => quest.id),
    ["starter-1", "campaign-1"],
  );
});

test("selectQuestBoard prioritizes featured tracks from the active campaign preset", () => {
  const result = selectQuestBoard({
    quests: [
      {
        id: "daily-1",
        title: "Daily",
        track: "daily" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: { xp: 40, tokenEffect: "none" as const },
        sortScore: 700,
      },
      {
        id: "premium-1",
        title: "Premium",
        track: "premium" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: { xp: 90, tokenEffect: "eligibility_progress" as const },
        sortScore: 650,
      },
      {
        id: "wallet-1",
        title: "Wallet",
        track: "wallet" as const,
        status: "active" as const,
        visible: true,
        lockedReason: null,
        unlockHint: null,
        projectedReward: { xp: 80, tokenEffect: "eligibility_progress" as const },
        sortScore: 600,
      },
    ],
    journeyState: "signed_up_free",
    campaignSource: "galxe",
    featuredTracks: ["premium", "wallet", "campaign"],
  });

  assert.deepEqual(
    result.active.slice(0, 2).map((quest) => quest.id),
    ["premium-1", "wallet-1"],
  );
});
