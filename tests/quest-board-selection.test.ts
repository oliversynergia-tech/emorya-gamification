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
  });

  assert.equal(result.active[0]?.id, "starter-1");
  assert.equal(result.lockedPreviews.length, 5);
  assert.equal(result.quests.length, 7);
});
