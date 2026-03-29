import type { QuestProgressUpdate, ReviewHistoryItem, ReviewQueueItem } from "@/lib/types";

export async function handleQuestSubmitRequest(
  {
    questId,
    payload,
  }: {
    questId: string;
    payload: Record<string, unknown>;
  },
  submitQuest: (input: {
    questId: string;
    payload: Record<string, unknown>;
  }) => Promise<unknown>,
) {
  try {
    const result = await submitQuest({ questId, payload });

    return {
      status: 200,
      body: { ok: true, ...((result as Record<string, unknown>) ?? {}) },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit quest.";

    return {
      status: message.includes("signed in") ? 401 : message.includes("not unlocked") ? 403 : 400,
      body: { ok: false, error: message },
    };
  }
}

export async function handleReviewQueueRequest(
  listPendingQuestReviews: () => Promise<ReviewQueueItem[]>,
) {
  try {
    const queue = await listPendingQuestReviews();

    return {
      status: 200,
      body: { ok: true, queue },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the review queue.";

    return {
      status: message.includes("signed in") ? 401 : message.includes("Admin access") ? 403 : 400,
      body: { ok: false, error: message },
    };
  }
}

export async function handleBulkReviewRequest(
  body: {
    completionIds?: string[];
    action?: "approved" | "rejected";
    moderationNote?: string;
    expectedCount?: number;
  },
  bulkReviewQuestSubmissions: (input: {
    completionIds: string[];
    action: "approved" | "rejected";
    moderationNote?: string;
  }) => Promise<Record<string, unknown>>,
) {
  if (!Array.isArray(body.completionIds) || body.completionIds.length === 0) {
    return {
      status: 400,
      body: { ok: false, error: "completionIds are required." },
    };
  }

  if (body.action !== "approved" && body.action !== "rejected") {
    return {
      status: 400,
      body: { ok: false, error: "Action must be approved or rejected." },
    };
  }

  if (typeof body.expectedCount !== "number" || body.expectedCount !== body.completionIds.length) {
    return {
      status: 400,
      body: { ok: false, error: "Bulk review confirmation count did not match the selected submissions." },
    };
  }

  try {
    const result = await bulkReviewQuestSubmissions({
      completionIds: body.completionIds,
      action: body.action,
      moderationNote: body.moderationNote,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process bulk review.";

    return {
      status: message.includes("signed in") ? 401 : message.includes("Admin access") ? 403 : 400,
      body: { ok: false, error: message },
    };
  }
}

export async function handleReviewPatchRequest(
  {
    completionId,
    body,
  }: {
    completionId: string;
    body: { action?: "approved" | "rejected"; moderationNote?: string };
  },
  reviewQuestSubmission: (input: {
    completionId: string;
    action: "approved" | "rejected";
    moderationNote?: string;
  }) => Promise<{
    progressUpdate?: QuestProgressUpdate | null;
    reviewHistory?: ReviewHistoryItem[];
  } & Record<string, unknown>>,
) {
  if (body.action !== "approved" && body.action !== "rejected") {
    return {
      status: 400,
      body: { ok: false, error: "Action must be approved or rejected." },
    };
  }

  try {
    const result = await reviewQuestSubmission({
      completionId,
      action: body.action,
      moderationNote: body.moderationNote,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review submission.";

    return {
      status: message.includes("signed in")
        ? 401
        : message.includes("Admin access")
          ? 403
          : message.includes("not found")
            ? 404
            : 400,
      body: { ok: false, error: message },
    };
  }
}

export async function handleApiQuestVerificationCallbackRequest(
  {
    questId,
    body,
    callbackToken,
  }: {
    questId: string;
    body: {
      completionId?: string;
      approved?: boolean;
      message?: string;
      verifierResponse?: Record<string, unknown>;
    };
    callbackToken: string;
  },
  resolveApiQuestVerificationCallback: (input: {
    questId: string;
    completionId: string;
    approved: boolean;
    callbackToken: string;
    message?: string;
    verifierResponse?: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>,
) {
  if (!body.completionId || typeof body.completionId !== "string") {
    return {
      status: 400,
      body: { ok: false, error: "completionId is required." },
    };
  }

  if (typeof body.approved !== "boolean") {
    return {
      status: 400,
      body: { ok: false, error: "approved must be true or false." },
    };
  }

  if (!callbackToken.trim()) {
    return {
      status: 401,
      body: { ok: false, error: "Verification callback token is required." },
    };
  }

  try {
    const result = await resolveApiQuestVerificationCallback({
      questId,
      completionId: body.completionId,
      approved: body.approved,
      callbackToken,
      message: body.message,
      verifierResponse: body.verifierResponse,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process verification callback.";

    return {
      status: message.includes("token")
        ? 401
        : message.includes("not found")
          ? 404
          : 400,
      body: { ok: false, error: message },
    };
  }
}
