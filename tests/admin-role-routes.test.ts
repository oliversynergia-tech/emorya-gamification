import assert from "node:assert/strict";
import test from "node:test";

import {
  handleAdminDirectoryRequest,
  handleAdminGrantRequest,
  handleAdminRevokeRequest,
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
