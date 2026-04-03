import assert from "node:assert/strict";
import test from "node:test";

import {
  getQuestSlugsForAppEvent,
  shouldDeriveActivationCompletion,
} from "../lib/app-event-map.ts";
import {
  activationPathCompletionQuestSlug,
  activationPathPrerequisiteQuestSlugs,
} from "../lib/progression-rules.ts";

test("getQuestSlugsForAppEvent returns the mapped activation quest slugs", () => {
  assert.deepEqual(getQuestSlugsForAppEvent("account_created"), ["create-emorya-account"]);
  assert.deepEqual(getQuestSlugsForAppEvent("wallet_connected"), ["connect-your-xportal-wallet"]);
  assert.deepEqual(getQuestSlugsForAppEvent("not-a-real-event"), []);
});

test("shouldDeriveActivationCompletion only passes when all prerequisites are complete", () => {
  assert.equal(shouldDeriveActivationCompletion([]), false);
  assert.equal(
    shouldDeriveActivationCompletion(activationPathPrerequisiteQuestSlugs.slice(0, -1)),
    false,
  );
  assert.equal(
    shouldDeriveActivationCompletion([...activationPathPrerequisiteQuestSlugs]),
    true,
  );
  assert.equal(
    shouldDeriveActivationCompletion([
      ...activationPathPrerequisiteQuestSlugs,
      activationPathCompletionQuestSlug,
    ]),
    false,
  );
});
