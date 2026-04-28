import assert from "node:assert/strict";
import test from "node:test";

import { validateQuestDefinitionRow } from "../scripts/quest-definition-validator.mjs";

test("validateQuestDefinitionRow accepts structured quest metadata", () => {
  const errors = validateQuestDefinitionRow({
    slug: "connect-xportal",
    verification_type: "wallet-check",
    xp_reward: 75,
    metadata: {
      track: "wallet",
      rewardConfig: {
        xp: {
          base: 75,
          premiumMultiplierEligible: true,
        },
        tokenEffect: "eligibility_progress",
        tokenEligibility: {
          progressPoints: 20,
        },
      },
      unlockRules: {
        all: [{ type: "wallet_linked", value: true }],
      },
      previewConfig: {
        label: "Wallet lane",
        desirability: 9,
      },
    },
  });

  assert.deepEqual(errors, []);
});

test("validateQuestDefinitionRow rejects malformed metadata", () => {
  const errors = validateQuestDefinitionRow({
    slug: "broken-quest",
    xp_reward: 50,
    metadata: {
      track: "unknown",
      rewardConfig: {
        xp: {
          base: 60,
        },
        tokenEffect: "wrong",
      },
      unlockRules: {
        all: [{ type: "not-real", value: true }],
      },
      previewConfig: {
        desirability: "high",
      },
    },
  });

  assert.ok(errors.some((entry: string) => entry.includes("metadata.track")));
  assert.ok(errors.some((entry: string) => entry.includes("xp.base")));
  assert.ok(errors.some((entry: string) => entry.includes("tokenEffect")));
  assert.ok(errors.some((entry: string) => entry.includes("unsupported rule type")));
  assert.ok(errors.some((entry: string) => entry.includes("previewConfig.desirability")));
});
