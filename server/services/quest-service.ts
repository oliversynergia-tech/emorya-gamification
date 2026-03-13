import type {
  CompletionStatus,
  ManualReviewSubmission,
  QuestProgressUpdate,
  ReviewHistoryItem,
  ReviewQueueItem,
} from "@/lib/types";
import { assertAdminUser } from "@/server/auth/admin";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { createActivityLogEntry, getUserProgressById } from "@/server/repositories/progression-repository";
import { applyQuestRewardTransition } from "@/server/services/progression-service";
import {
  getPendingReviewQueue,
  getQuestCompletionForUser,
  getQuestDefinitionById,
  getRecentReviewHistory,
  getUserQuestAccess,
  updateQuestCompletionReview,
  upsertQuestCompletionForUser,
  userCanAccessQuest,
} from "@/server/repositories/quest-repository";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeManualReviewSubmission(
  payload: Record<string, unknown>,
  submittedAt: string,
): ManualReviewSubmission {
  const contentUrl = normalizeText(payload.contentUrl);
  const screenshotUrl = normalizeText(payload.screenshotUrl);
  const platform = normalizeText(payload.platform);
  const note = normalizeText(payload.note);

  if (!contentUrl) {
    throw new Error("Manual review quests require a content URL.");
  }

  return {
    contentUrl,
    screenshotUrl: screenshotUrl || null,
    platform: platform || null,
    note: note || null,
    submittedAt,
  };
}

async function logQuestActivity({
  userId,
  actor,
  actionType,
  action,
  detail,
  questId,
  questTitle,
  xpEarned = 0,
}: {
  userId: string;
  actor: string;
  actionType: string;
  action: string;
  detail: string;
  questId: string;
  questTitle: string;
  xpEarned?: number;
}) {
  await createActivityLogEntry({
    userId,
    actionType,
    xpEarned,
    metadata: {
      actor,
      action,
      detail,
      questId,
      questTitle,
    },
  });
}

export async function submitQuest({
  questId,
  payload,
}: {
  questId: string;
  payload: Record<string, unknown>;
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to submit a quest.");
  }

  const [user, quest] = await Promise.all([
    getUserQuestAccess(currentUser.id),
    getQuestDefinitionById(questId),
  ]);

  if (!user || !quest) {
    throw new Error("Quest not found.");
  }

  if (!userCanAccessQuest(user, quest)) {
    throw new Error("This quest is not unlocked for your account.");
  }

  const existingCompletion = await getQuestCompletionForUser(currentUser.id, questId);

  if (existingCompletion?.status === "approved" && quest.recurrence === "one-time") {
    throw new Error("This quest has already been completed.");
  }

  const submittedAt = new Date().toISOString();

  if (quest.verification_type === "quiz") {
    const answersCorrect = normalizeNumber(payload.answersCorrect);
    const totalQuestions = Number(quest.metadata.totalQuestions ?? 5);
    const passScore = Number(quest.metadata.passScore ?? totalQuestions);

    if (!Number.isInteger(answersCorrect) || answersCorrect < 0 || answersCorrect > totalQuestions) {
      throw new Error(`Quiz submissions must include answersCorrect between 0 and ${totalQuestions}.`);
    }

    const status: CompletionStatus = answersCorrect >= passScore ? "approved" : "rejected";
    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status,
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: currentUser.id,
      completedAt: status === "approved" ? submittedAt : null,
      submissionData: {
        answersCorrect,
        totalQuestions,
        passScore,
        submittedAt,
      },
    });

    let progressUpdate: QuestProgressUpdate | null = null;

    if (status === "approved") {
      progressUpdate = await applyQuestRewardTransition({
        userId: currentUser.id,
        completionId: completion.id,
        questId,
        questTitle: quest.title,
        questXpReward: quest.xp_reward,
        previousAwardedXp: existingCompletion?.awardedXp ?? 0,
        shouldBeApproved: true,
      });
    } else {
      await logQuestActivity({
        userId: currentUser.id,
        actor: currentUser.displayName,
        actionType: "quest-rejected",
        action: "missed a quest check",
        detail: `${quest.title} did not meet the required score`,
        questId,
        questTitle: quest.title,
      });
    }

    return {
      completion,
      outcome: status,
      progressUpdate,
      message:
        status === "approved"
          ? `Quiz passed with ${answersCorrect}/${totalQuestions}.`
          : `Quiz score ${answersCorrect}/${totalQuestions} did not meet the pass score.`,
    };
  }

  if (quest.verification_type === "link-visit") {
    const targetUrl = normalizeText(payload.targetUrl || quest.metadata.targetUrl);

    if (!targetUrl) {
      throw new Error("Link visit quests require a target URL.");
    }

    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status: "approved",
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: currentUser.id,
      completedAt: submittedAt,
      submissionData: {
        targetUrl,
        visited: true,
        submittedAt,
      },
    });

    const progressUpdate = await applyQuestRewardTransition({
      userId: currentUser.id,
      completionId: completion.id,
      questId,
      questTitle: quest.title,
      questXpReward: quest.xp_reward,
      previousAwardedXp: existingCompletion?.awardedXp ?? 0,
      shouldBeApproved: true,
    });

    return {
      completion,
      outcome: "approved" as const,
      progressUpdate,
      message: "Link visit recorded.",
    };
  }

  if (quest.verification_type === "manual-review") {
    const submissionData = normalizeManualReviewSubmission(payload, submittedAt);

    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status: "pending",
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: null,
      completedAt: null,
      submissionData,
    });

    await logQuestActivity({
      userId: currentUser.id,
      actor: currentUser.displayName,
      actionType: "quest-submitted",
      action: "submitted a quest",
      detail: `${quest.title} is waiting for review`,
      questId,
      questTitle: quest.title,
    });

    return {
      completion,
      outcome: "pending" as const,
      progressUpdate: null,
      message: "Submission sent for review.",
    };
  }

  throw new Error(`Verification type ${quest.verification_type} is not supported yet.`);
}

export async function listPendingQuestReviews(): Promise<ReviewQueueItem[]> {
  const currentUser = await getAuthenticatedUser();
  assertAdminUser(currentUser);

  return getPendingReviewQueue();
}

export async function listRecentQuestReviews(): Promise<ReviewHistoryItem[]> {
  const currentUser = await getAuthenticatedUser();
  assertAdminUser(currentUser);

  return getRecentReviewHistory();
}

export async function reviewQuestSubmission({
  completionId,
  action,
  moderationNote,
}: {
  completionId: string;
  action: "approved" | "rejected";
  moderationNote?: string;
}) {
  const currentUser = await getAuthenticatedUser();
  assertAdminUser(currentUser);

  const existingCompletion = await getPendingReviewQueue().then((queue) =>
    queue.find((item) => item.id === completionId) ?? null,
  );

  const nextSubmissionData = existingCompletion
    ? ({
        ...existingCompletion.submissionData,
        moderationNote: normalizeText(moderationNote) || null,
        moderatedAt: new Date().toISOString(),
      } as ManualReviewSubmission)
    : undefined;

  const completion = await updateQuestCompletionReview({
    completionId,
    reviewerId: currentUser.id,
    status: action,
    submissionData: nextSubmissionData,
  });

  if (!completion) {
    throw new Error("Submission not found.");
  }

  const quest = await getQuestDefinitionById(completion.questId);

  if (!quest) {
    throw new Error("Quest not found.");
  }

  const progressUpdate = await applyQuestRewardTransition({
    userId: completion.userId,
    completionId: completion.id,
    questId: completion.questId,
    questTitle: quest.title,
    questXpReward: quest.xp_reward,
    previousAwardedXp: completion.awardedXp,
    shouldBeApproved: action === "approved",
  });

  if (action === "rejected") {
    const reviewedUser = await getUserProgressById(completion.userId);

    if (reviewedUser) {
      await logQuestActivity({
        userId: completion.userId,
        actor: reviewedUser.display_name,
        actionType: "quest-rejected",
        action: "needs a quest revision",
        detail: `${quest.title} was rejected and can be resubmitted`,
        questId: completion.questId,
        questTitle: quest.title,
      });
    }
  }

  return {
    completion,
    progressUpdate,
  };
}
