import assert from "node:assert/strict";
import test from "node:test";

import {
  handleAdminDirectoryRequest,
  handleEconomySettingsRequest,
  handleEconomySettingsUpdateRequest,
  handleAdminGrantRequest,
  handleModerationNotificationAcknowledgeRequest,
  handleAdminRevokeRequest,
  handleQuestDefinitionCreateRequest,
  handleQuestDefinitionDeleteRequest,
  handleQuestDefinitionDirectoryRequest,
  handleQuestDefinitionUpdateRequest,
  handleReviewerRoleUpdateRequest,
  handleRoleDirectoryRequest,
} from "../server/http/admin-handlers.ts";

test("handleAdminGrantRequest rejects missing fields", async () => {
  const result = await handleAdminGrantRequest({}, async () => {
    throw new Error("should not be called");
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "email and confirmation are required.",
  });
});

test("handleAdminGrantRequest maps super admin protection failures to 403", async () => {
  const result = await handleAdminGrantRequest(
    {
      email: "target@example.com",
      confirmation: "GRANT ADMIN",
    },
    async () => {
      throw new Error("Super admin access is required for this action.");
    },
  );

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Super admin access is required for this action.",
  });
});

test("handleAdminGrantRequest returns the refreshed directories on success", async () => {
  const result = await handleAdminGrantRequest(
    {
      email: "target@example.com",
      confirmation: "GRANT ADMIN",
    },
    async ({ email, confirmation }) => {
      assert.equal(email, "target@example.com");
      assert.equal(confirmation, "GRANT ADMIN");

      return {
        roleDirectory: [{ userId: "user-1" }],
        adminDirectory: [{ userId: "user-1", role: "admin" }],
      };
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    roleDirectory: [{ userId: "user-1" }],
    adminDirectory: [{ userId: "user-1", role: "admin" }],
  });
});

test("handleAdminRevokeRequest maps signed-out access to 401", async () => {
  const result = await handleAdminRevokeRequest(
    {
      userId: "user-1",
      confirmation: "REVOKE ADMIN",
    },
    async () => {
      throw new Error("You must be signed in to access admin controls.");
    },
  );

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    ok: false,
    error: "You must be signed in to access admin controls.",
  });
});

test("handleAdminDirectoryRequest maps protected access failures to 403", async () => {
  const result = await handleAdminDirectoryRequest(async () => {
    throw new Error("Super admin access is required for this action.");
  });

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Super admin access is required for this action.",
  });
});

test("handleRoleDirectoryRequest returns the user directory on success", async () => {
  const result = await handleRoleDirectoryRequest(async () => [{ userId: "user-1" }]);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    users: [{ userId: "user-1" }],
  });
});

test("handleReviewerRoleUpdateRequest validates required fields", async () => {
  const result = await handleReviewerRoleUpdateRequest({}, async () => {
    throw new Error("should not be called");
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "userId and reviewerEnabled are required.",
  });
});

test("handleReviewerRoleUpdateRequest maps admin access failures to 403", async () => {
  const result = await handleReviewerRoleUpdateRequest(
    {
      userId: "user-2",
      reviewerEnabled: true,
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

test("handleReviewerRoleUpdateRequest returns the refreshed role directory on success", async () => {
  const result = await handleReviewerRoleUpdateRequest(
    {
      userId: "user-2",
      reviewerEnabled: false,
    },
    async ({ userId, enabled }) => {
      assert.equal(userId, "user-2");
      assert.equal(enabled, false);

      return [{ userId: "user-2", roles: ["admin"] }];
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    users: [{ userId: "user-2", roles: ["admin"] }],
  });
});

test("handleQuestDefinitionDirectoryRequest returns quest definitions on success", async () => {
  const result = await handleQuestDefinitionDirectoryRequest(async () => [{ id: "quest-1" }]);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-1" }],
  });
});

test("handleQuestDefinitionCreateRequest maps validation failures to 400", async () => {
  const result = await handleQuestDefinitionCreateRequest({}, async () => {
    throw new Error("Quest definition requires slug, title, description, category, difficulty, verificationType, recurrence, requiredTier, requiredLevel, and xpReward.");
  });

  assert.equal(result.status, 400);
  assert.match(String(result.body.error), /Quest definition requires slug/);
});

test("handleQuestDefinitionUpdateRequest maps missing quest definitions to 404", async () => {
  const result = await handleQuestDefinitionUpdateRequest(
    {
      questId: "quest-1",
      body: { slug: "quest-1" },
    },
    async () => {
      throw new Error("Quest definition not found.");
    },
  );

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Quest definition not found.",
  });
});

test("handleQuestDefinitionDeleteRequest returns refreshed quest definitions on success", async () => {
  const result = await handleQuestDefinitionDeleteRequest("quest-1", async (questId) => {
    assert.equal(questId, "quest-1");
    return [{ id: "quest-2" }];
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-2" }],
  });
});

test("handleModerationNotificationAcknowledgeRequest validates delivery id", async () => {
  const result = await handleModerationNotificationAcknowledgeRequest("", async () => {
    throw new Error("should not be called");
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "deliveryId is required.",
  });
});

test("handleModerationNotificationAcknowledgeRequest returns refreshed history", async () => {
  const result = await handleModerationNotificationAcknowledgeRequest("delivery-1", async (deliveryId) => {
    assert.equal(deliveryId, "delivery-1");
    return [{ id: "delivery-1", eventStatus: "acknowledged" }];
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    history: [{ id: "delivery-1", eventStatus: "acknowledged" }],
  });
});

test("handleEconomySettingsRequest returns settings payload on success", async () => {
  const result = await handleEconomySettingsRequest(async () => ({
    settings: { payoutAsset: "EMR" },
    audit: [],
  }));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    settings: { payoutAsset: "EMR" },
    audit: [],
  });
});

test("handleEconomySettingsUpdateRequest maps super admin access failures to 403", async () => {
  const result = await handleEconomySettingsUpdateRequest(
    {
      payoutAsset: "EMR",
    },
    async () => {
      throw new Error("Super admin access is required for this action.");
    },
  );

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Super admin access is required for this action.",
  });
});
