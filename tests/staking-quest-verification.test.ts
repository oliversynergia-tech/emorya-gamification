import test from "node:test";
import assert from "node:assert/strict";

import { parseStakingQuestVerificationConfig } from "../server/services/staking-quest-verification.ts";

test("parseStakingQuestVerificationConfig parses threshold staking metadata", () => {
  const result = parseStakingQuestVerificationConfig({
    stakingVerification: {
      mode: "threshold",
      assetSymbol: "EMR",
      thresholdAmount: 500,
      thresholdLabel: "Threshold A",
      fallbackMode: "pending-review",
    },
  });

  assert.deepEqual(result, {
    mode: "threshold",
    assetSymbol: "EMR",
    thresholdAmount: 500,
    thresholdLabel: "Threshold A",
    requiredHoldDays: undefined,
    fallbackMode: "pending-review",
  });
});

test("parseStakingQuestVerificationConfig parses hold-duration metadata", () => {
  const result = parseStakingQuestVerificationConfig({
    stakingVerification: {
      mode: "hold-duration",
      assetSymbol: "EMR",
      thresholdAmount: 1000,
      requiredHoldDays: 30,
    },
  });

  assert.deepEqual(result, {
    mode: "hold-duration",
    assetSymbol: "EMR",
    thresholdAmount: 1000,
    thresholdLabel: undefined,
    requiredHoldDays: 30,
    fallbackMode: "manual-review",
  });
});

test("parseStakingQuestVerificationConfig returns null for invalid metadata", () => {
  assert.equal(parseStakingQuestVerificationConfig({}), null);
  assert.equal(
    parseStakingQuestVerificationConfig({
      stakingVerification: {
        mode: "not-real",
      },
    }),
    null,
  );
});
