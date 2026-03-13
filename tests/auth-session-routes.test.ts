import assert from "node:assert/strict";
import test from "node:test";

import {
  handleSessionLookupRequest,
  handleSignInRequest,
  handleSignOutRequest,
} from "../server/http/auth-handlers.ts";

test("handleSignInRequest completes through the auth route callback and can issue a session", async () => {
  let issuedSession = false;

  const result = await handleSignInRequest(
    {
      email: "casey@example.com",
      password: "valid-password",
    },
    async ({ email }) => {
      issuedSession = true;

      return {
        id: "user-1",
        email,
        displayName: "Casey",
        subscriptionTier: "free",
      };
    },
  );

  assert.equal(issuedSession, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test("handleSignOutRequest invokes the sign-out callback and returns an ok payload", async () => {
  let signOutCalled = false;

  const result = await handleSignOutRequest(async () => {
    signOutCalled = true;
  });

  assert.equal(signOutCalled, true);
  assert.deepEqual(result, {
    status: 200,
    body: { ok: true },
  });
});

test("handleSessionLookupRequest returns an anonymous session payload when no session exists", async () => {
  const result = await handleSessionLookupRequest(async () => null);

  assert.deepEqual(result, {
    status: 200,
    body: {
      ok: true,
      authenticated: false,
      user: null,
      walletAddresses: [],
    },
  });
});

test("handleSessionLookupRequest returns the current session payload with linked wallets", async () => {
  const result = await handleSessionLookupRequest(async () => ({
    user: {
      id: "user-1",
      email: "casey@example.com",
      displayName: "Casey",
      subscriptionTier: "annual",
    },
    walletAddresses: ["erd1examplewallet"],
  }));

  assert.equal(result.status, 200);
  assert.equal(result.body.authenticated, true);
  assert.deepEqual(result.body.walletAddresses, ["erd1examplewallet"]);
  assert.equal(result.body.user?.displayName, "Casey");
});
