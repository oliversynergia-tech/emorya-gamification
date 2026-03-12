import type { CompletionStatus, QuestProgressUpdate, ReviewQueueItem } from "@/lib/types";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { applyQuestRewardTransition } from "@/server/services/progression-service";
import {
  getPendingReviewQueue,
  getQuestCompletionForUser,
  getQuestDefinitionById,
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
    const contentUrl = normalizeText(payload.contentUrl);
    const note = normalizeText(payload.note);

    if (!contentUrl) {
      throw new Error("Manual review quests require a content URL.");
    }

    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status: "pending",
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: null,
      completedAt: null,
      submissionData: {
        contentUrl,
        note: note || null,
        submittedAt,
      },
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

  if (!currentUser) {
    throw new Error("You must be signed in to view the review queue.");
  }

  return getPendingReviewQueue();
}

export async function reviewQuestSubmission({
  completionId,
  action,
}: {
  completionId: string;
  action: "approved" | "rejected";
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to review submissions.");
  }

  const completion = await updateQuestCompletionReview({
    completionId,
    reviewerId: currentUser.id,
    status: action,
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

  return {
    completion,
    progressUpdate,
  };
}
