import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateQuizSubmission,
  mergeModerationIntoSubmission,
  normalizeManualReviewSubmission,
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
    platform: "x",
    note: "Posted a recap thread.",
    submittedAt,
  });

  assert.throws(
    () => normalizeManualReviewSubmission({ note: "missing url" }, submittedAt),
    /require a content URL/,
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
      submittedAt: "2026-03-13T12:00:00.000Z",
    },
    "  Great submission, approved.  ",
    moderatedAt,
  );

  assert.deepEqual(result, {
    contentUrl: "https://x.com/emorya/status/123",
    screenshotUrl: "https://cdn.emorya.app/proof.png",
    platform: "x",
    note: "Initial submission note",
    submittedAt: "2026-03-13T12:00:00.000Z",
    moderationNote: "Great submission, approved.",
    moderatedAt,
  });
});
