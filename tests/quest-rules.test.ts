import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateQuizSubmission,
  mergeModerationIntoSubmission,
  normalizeManualReviewSubmission,
  normalizeTextSubmission,
} from "../server/services/quest-rules.ts";

test("evaluateQuizSubmission approves passing scores and preserves quiz metadata", () => {
  const result = evaluateQuizSubmission({
    answersCorrect: "4",
    totalQuestions: 5,
    passScore: 4,
  });

  assert.deepEqual(result, {
    answersCorrect: 4,
    totalQuestions: 5,
    passScore: 4,
    status: "approved",
  });
});

test("evaluateQuizSubmission rejects failing scores and invalid answer counts", () => {
  const result = evaluateQuizSubmission({
    answersCorrect: 2,
    totalQuestions: 5,
    passScore: 4,
  });

  assert.equal(result.status, "rejected");
  assert.throws(
    () =>
      evaluateQuizSubmission({
        answersCorrect: 6,
        totalQuestions: 5,
        passScore: 4,
      }),
    /answersCorrect between 0 and 5/,
  );
});

test("normalizeManualReviewSubmission enforces contentUrl and normalizes optional fields", () => {
  const submittedAt = "2026-03-13T12:00:00.000Z";
  const result = normalizeManualReviewSubmission(
    {
      contentUrl: " https://x.com/emorya/status/123 ",
      screenshotUrl: "  https://cdn.emorya.app/proof.png  ",
      platform: " x ",
      note: "  Posted a recap thread.  ",
    },
    submittedAt,
  );

  assert.deepEqual(result, {
    contentUrl: "https://x.com/emorya/status/123",
    screenshotUrl: "https://cdn.emorya.app/proof.png",
    proofFileUrl: null,
    proofFileName: null,
    proofFileType: null,
    platform: "x",
    note: "Posted a recap thread.",
    profileUrl: null,
    sharedAt: null,
    taskSubmissions: undefined,
    submittedAt,
  });

  assert.throws(
    () => normalizeManualReviewSubmission({ note: "missing url" }, submittedAt),
    /require a content URL/,
  );
});

test("normalizeManualReviewSubmission accepts task-level evidence for multi-step quests", () => {
  const submittedAt = "2026-03-13T12:00:00.000Z";
  const result = normalizeManualReviewSubmission(
    {
      taskSubmissions: [
        {
          taskId: "join-discord",
          contentUrl: " https://discord.gg/emorya ",
          note: " Joined the server ",
        },
        {
          taskId: "share-post",
          proofFileUrl: "/uploads/quest-proofs/proof.png",
          proofFileName: "proof.png",
          proofFileType: "image/png",
        },
      ],
    },
    submittedAt,
    {
      taskBlocks: [
        { id: "join-discord", label: "Join Discord" },
        { id: "share-post", label: "Share a post" },
      ],
    },
  );

  assert.deepEqual(result, {
    contentUrl: "",
    screenshotUrl: null,
    proofFileUrl: null,
    proofFileName: null,
    proofFileType: null,
    platform: null,
    note: null,
    profileUrl: null,
    sharedAt: null,
    taskSubmissions: [
      {
        taskId: "join-discord",
        contentUrl: "https://discord.gg/emorya",
        note: "Joined the server",
        proofFileUrl: null,
        proofFileName: null,
        proofFileType: null,
      },
      {
        taskId: "share-post",
        contentUrl: null,
        note: null,
        proofFileUrl: "/uploads/quest-proofs/proof.png",
        proofFileName: "proof.png",
        proofFileType: "image/png",
      },
    ],
    submittedAt,
  });
});

test("normalizeManualReviewSubmission requires all required multi-step tasks", () => {
  const submittedAt = "2026-03-13T12:00:00.000Z";

  assert.throws(
    () =>
      normalizeManualReviewSubmission(
        {
          taskSubmissions: [{ taskId: "join-discord", contentUrl: "https://discord.gg/emorya" }],
        },
        submittedAt,
        {
          taskBlocks: [
            { id: "join-discord", label: "Join Discord" },
            { id: "share-post", label: "Share a post" },
          ],
        },
      ),
    /Complete all required quest tasks/,
  );
});

test("mergeModerationIntoSubmission attaches moderation details without losing submission data", () => {
  const moderatedAt = "2026-03-13T14:30:00.000Z";
  const result = mergeModerationIntoSubmission(
    {
      contentUrl: "https://x.com/emorya/status/123",
      screenshotUrl: "https://cdn.emorya.app/proof.png",
      platform: "x",
      note: "Initial submission note",
      taskSubmissions: [{ taskId: "join-discord", contentUrl: "https://discord.gg/emorya", note: null }],
      submittedAt: "2026-03-13T12:00:00.000Z",
    },
    "  Great submission, approved.  ",
    moderatedAt,
  );

  assert.deepEqual(result, {
    contentUrl: "https://x.com/emorya/status/123",
    screenshotUrl: "https://cdn.emorya.app/proof.png",
    proofFileUrl: null,
    proofFileName: null,
    proofFileType: null,
    platform: "x",
    note: "Initial submission note",
    profileUrl: null,
    sharedAt: null,
    taskSubmissions: [{ taskId: "join-discord", contentUrl: "https://discord.gg/emorya", note: null }],
    submittedAt: "2026-03-13T12:00:00.000Z",
    moderationNote: "Great submission, approved.",
    moderatedAt,
  });
});

test("normalizeTextSubmission requires a written response and preserves optional fields", () => {
  const submittedAt = "2026-03-13T12:00:00.000Z";

  const result = normalizeTextSubmission(
    {
      response: "  Referred two teammates and explained the flow. ",
      referenceUrl: " https://example.com/referral-proof ",
      platform: " referral ",
    },
    submittedAt,
  );

  assert.deepEqual(result, {
    response: "Referred two teammates and explained the flow.",
    referenceUrl: "https://example.com/referral-proof",
    platform: "referral",
    submittedAt,
  });

  assert.throws(
    () => normalizeTextSubmission({ response: "   " }, submittedAt),
    /require a written response/,
  );
});
