import test from "node:test";
import assert from "node:assert/strict";

import {
  executeApiQuestVerification,
  mergeApiVerificationCallbackSubmission,
  parseApiQuestVerificationConfig,
} from "../server/services/api-quest-verification.ts";

test("parseApiQuestVerificationConfig returns null without endpoint", () => {
  assert.equal(parseApiQuestVerificationConfig({}), null);
  assert.equal(parseApiQuestVerificationConfig({ apiVerification: { method: "POST" } }), null);
});

test("parseApiQuestVerificationConfig normalizes method and failure mode", () => {
  const config = parseApiQuestVerificationConfig({
    apiVerification: {
      endpointUrl: " https://verifier.example.com/check ",
      method: "get",
      authHeaderName: " x-api-key ",
      authHeaderValue: " secret ",
      failureMode: "pending-review",
      callbackToken: " callback-secret ",
    },
  });

  assert.deepEqual(config, {
    endpointUrl: "https://verifier.example.com/check",
    method: "GET",
    authHeaderName: "x-api-key",
    authHeaderValue: "secret",
    failureMode: "pending-review",
    callbackToken: "callback-secret",
  });
});

test("executeApiQuestVerification approves when the endpoint returns approved", async () => {
  const result = await executeApiQuestVerification({
    config: {
      endpointUrl: "https://verifier.example.com/check",
      method: "POST",
      failureMode: "reject",
    },
    quest: {
      id: "quest-1",
      title: "Join campaign",
      verificationType: "api-check",
    },
    user: {
      id: "user-1",
      email: "user@example.com",
      displayName: "Oliver",
    },
    payload: {
      platform: "X",
      contentUrl: "https://x.com/example/status/1",
      note: "submitted",
    },
    submittedAt: "2026-03-25T12:00:00.000Z",
    fetcher: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          approved: true,
          message: "Verified externally.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  });

  assert.equal(result.status, "approved");
  assert.equal(result.message, "Verified externally.");
  assert.equal(
    (result.submissionData.apiVerification as Record<string, unknown>).approved,
    true,
  );
});

test("executeApiQuestVerification falls back to pending review when configured", async () => {
  const result = await executeApiQuestVerification({
    config: {
      endpointUrl: "https://verifier.example.com/check",
      method: "GET",
      failureMode: "pending-review",
    },
    quest: {
      id: "quest-1",
      title: "Join campaign",
      verificationType: "api-check",
    },
    user: {
      id: "user-1",
      email: "user@example.com",
      displayName: "Oliver",
    },
    payload: {
      contentUrl: "submission-123",
    },
    submittedAt: "2026-03-25T12:00:00.000Z",
    fetcher: async (input) => {
      assert.ok(String(input).includes("submission-123"));
      return new Response(
        JSON.stringify({
          ok: true,
          approved: false,
          message: "Needs human review.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(result.status, "pending");
  assert.equal(result.message, "Needs human review.");
});

test("mergeApiVerificationCallbackSubmission records callback state", () => {
  const merged = mergeApiVerificationCallbackSubmission({
    submissionData: {
      submittedAt: "2026-03-25T12:00:00.000Z",
      platform: "Zealy",
      contentUrl: "submission-123",
      apiVerification: {
        endpointUrl: "https://verifier.example.com/check",
        method: "POST",
        approved: false,
        message: "Awaiting callback.",
      },
    },
    approved: true,
    callbackAt: "2026-03-29T09:30:00.000Z",
    callbackMessage: "Credential verified asynchronously.",
    verifierResponse: {
      proofId: "proof-1",
    },
  });

  assert.equal((merged.apiVerification as Record<string, unknown>).approved, true);
  assert.equal(
    (merged.apiVerification as Record<string, unknown>).callbackReceivedAt,
    "2026-03-29T09:30:00.000Z",
  );
  assert.equal(merged.moderationNote, "Credential verified asynchronously.");
});
