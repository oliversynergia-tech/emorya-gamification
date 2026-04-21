import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSocialConnectionsForProfileUpdate } from "../lib/profile-update-policy.ts";
import { isSupportedLiveQuestVerificationType } from "../lib/quest-verification-policy.ts";

test("profile updates cannot self-verify social connections", () => {
  const [connection] = normalizeSocialConnectionsForProfileUpdate([
    {
      platform: "X",
      handle: "@emorya",
      verified: true,
      connectedAt: "2026-04-21T00:00:00.000Z",
    },
  ]);

  assert.equal(connection.platform, "X");
  assert.equal(connection.handle, "@emorya");
  assert.equal(connection.verified, false);
  assert.equal(connection.connectedAt, null);
});

test("live quest verification types exclude reserved social oauth", () => {
  assert.equal(isSupportedLiveQuestVerificationType("manual-review"), true);
  assert.equal(isSupportedLiveQuestVerificationType("wallet-check"), true);
  assert.equal(isSupportedLiveQuestVerificationType("social-oauth"), false);
});
