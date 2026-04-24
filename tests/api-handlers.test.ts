import assert from "node:assert/strict";
import test from "node:test";

import { handleSignInRequest, handleSignUpRequest } from "../server/http/auth-handlers.ts";
import {
  handleBulkReviewRequest,
  handleQuestSubmitRequest,
  handleReviewPatchRequest,
  handleReviewQueueRequest,
} from "../server/http/quest-handlers.ts";

test("handleSignUpRequest rejects missing fields", async () => {
  const result = await handleSignUpRequest(
    {
      email: "missing@example.com",
      password: "validpassword",
    },
    async () => {
      throw new Error("should not be called");
    },
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Email, password, and display name are required.",
  });
});

test("handleSignUpRequest rejects short passwords", async () => {
  const result = await handleSignUpRequest(
    {
      email: "short@example.com",
      password: "short",
      displayName: "Short",
    },
    async () => {
      throw new Error("should not be called");
    },
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Password must be at least 10 characters.",
  });
});

test("handleSignUpRequest normalizes email, referral code, and forwards source", async () => {
  let receivedEmail = "";
  let receivedReferralCode = "";
  let receivedSource = "";

  const result = await handleSignUpRequest(
    {
      email: "  CASEY@EXAMPLE.COM ",
      password: "valid-password",
      displayName: "Casey",
      referralCode: " emorya-8w3k9r ",
      source: "galxe",
    },
    async ({ email, referralCode, source }) => {
      receivedEmail = email;
      receivedReferralCode = referralCode ?? "";
      receivedSource = source ?? "";

      return {
        id: "user-1",
        email,
        displayName: "Casey",
        subscriptionTier: "free",
      };
    },
  );

  assert.equal(receivedEmail, "casey@example.com");
  assert.equal(receivedReferralCode, "EMORYA-8W3K9R");
  assert.equal(receivedSource, "galxe");
  assert.equal(result.status, 201);
  assert.equal(result.body.ok, true);
});

test("handleSignInRequest normalizes email and returns the signed-in user", async () => {
  let receivedEmail = "";

  const result = await handleSignInRequest(
    {
      email: "  CASEY@EXAMPLE.COM ",
      password: "valid-password",
    },
    async ({ email }) => {
      receivedEmail = email;

      return {
        id: "user-1",
        email,
        displayName: "Casey",
        subscriptionTier: "free",
      };
    },
  );

  assert.equal(receivedEmail, "casey@example.com");
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test("handleQuestSubmitRequest maps unauthenticated errors to 401", async () => {
  const result = await handleQuestSubmitRequest(
    {
      questId: "quest-1",
      payload: {},
    },
    async () => {
      throw new Error("You must be signed in to submit a quest.");
    },
  );

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    ok: false,
    error: "You must be signed in to submit a quest.",
  });
});

test("handleReviewPatchRequest rejects invalid actions before calling the service", async () => {
  const result = await handleReviewPatchRequest(
    {
      completionId: "completion-1",
      body: { action: undefined },
    },
    async () => {
      throw new Error("should not be called");
    },
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Action must be approved or rejected.",
  });
});

test("handleReviewQueueRequest maps admin auth failures to 403", async () => {
  const result = await handleReviewQueueRequest(async () => {
    throw new Error("Admin access is required for this action.");
  });

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Admin access is required for this action.",
  });
});

test("handleReviewPatchRequest maps admin auth failures to 403", async () => {
  const result = await handleReviewPatchRequest(
    {
      completionId: "completion-1",
      body: { action: "approved" },
    },
    async () => {
      throw new Error("Admin access is required for this action.");
    },
  );

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Admin access is required for this action.",
  });
});

test("handleBulkReviewRequest rejects mismatched confirmation counts", async () => {
  const result = await handleBulkReviewRequest(
    {
      completionIds: ["one", "two"],
      action: "approved",
      expectedCount: 1,
    },
    async () => {
      throw new Error("should not be called");
    },
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Bulk review confirmation count did not match the selected submissions.",
  });
});

test("handleBulkReviewRequest maps admin auth failures to 403", async () => {
  const result = await handleBulkReviewRequest(
    {
      completionIds: ["one"],
      action: "rejected",
      expectedCount: 1,
    },
    async () => {
      throw new Error("Admin access is required for this action.");
    },
  );

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Admin access is required for this action.",
  });
});

test("handleBulkReviewRequest returns service payload on success", async () => {
  const result = await handleBulkReviewRequest(
    {
      completionIds: ["one", "two"],
      action: "approved",
      moderationNote: "Looks good",
      expectedCount: 2,
    },
    async ({ completionIds, action, moderationNote }) => {
      assert.deepEqual(completionIds, ["one", "two"]);
      assert.equal(action, "approved");
      assert.equal(moderationNote, "Looks good");

      return {
        reviewedCount: 2,
        failedCount: 0,
      };
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    reviewedCount: 2,
    failedCount: 0,
  });
});
