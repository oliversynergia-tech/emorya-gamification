import type {
  CompletionStatus,
  QuestProgressUpdate,
  ReviewHistoryItem,
  ReviewQueueItem,
} from "@/lib/types";
import { assertAdminUser } from "@/server/auth/admin";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { findWalletIdentityDetailsForUser } from "@/server/repositories/auth-repository";
import {
  evaluateQuizSubmission,
  mergeModerationIntoSubmission,
  normalizeManualReviewSubmission,
  normalizeTextSubmission,
} from "@/server/services/quest-rules";
import {
  executeApiQuestVerification,
  mergeApiVerificationCallbackSubmission,
  parseApiQuestVerificationConfig,
} from "@/server/services/api-quest-verification";
import { createActivityLogEntry, getUserProgressById } from "@/server/repositories/progression-repository";
import { applyQuestRewardTransition } from "@/server/services/progression-service";
import { resolveWalletQuestVerification } from "@/server/services/wallet-quest-rules";
import {
  getPendingReviewQueue,
  getQuestCompletionById,
  getQuestCompletionForUser,
  getQuestDefinitionById,
  getRecentReviewHistory,
  getReviewerWorkload,
  getUserQuestAccess,
  updateQuestCompletionReview,
  upsertQuestCompletionForUser,
  userCanAccessQuest,
} from "@/server/repositories/quest-repository";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSameUtcMonth(timestamp: string, referenceTimestamp: string) {
  const timestampDate = new Date(timestamp);
  const referenceDate = new Date(referenceTimestamp);
  return (
    timestampDate.getUTCFullYear() === referenceDate.getUTCFullYear() &&
    timestampDate.getUTCMonth() === referenceDate.getUTCMonth()
  );
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

  const submittedAt = new Date().toISOString();

  if (existingCompletion?.status === "approved") {
    if (quest.recurrence === "one-time") {
      throw new Error("This quest has already been completed.");
    }

    if (quest.recurrence === "monthly" && existingCompletion.completedAt && isSameUtcMonth(existingCompletion.completedAt, submittedAt)) {
      throw new Error("This quest is only available once per month.");
    }
  }

  if (quest.verification_type === "quiz") {
    const totalQuestions = Number(quest.metadata.totalQuestions ?? 5);
    const passScore = Number(quest.metadata.passScore ?? totalQuestions);
    const quizResult = evaluateQuizSubmission({
      answersCorrect: payload.answersCorrect,
      totalQuestions,
      passScore,
    });
    const status: CompletionStatus = quizResult.status;
    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status,
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: currentUser.id,
      completedAt: status === "approved" ? submittedAt : null,
      submissionData: {
        answersCorrect: quizResult.answersCorrect,
        totalQuestions: quizResult.totalQuestions,
        passScore: quizResult.passScore,
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
          ? `Quiz passed with ${quizResult.answersCorrect}/${totalQuestions}.`
          : `Quiz score ${quizResult.answersCorrect}/${totalQuestions} did not meet the pass score.`,
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
    const submissionData = normalizeManualReviewSubmission(payload, submittedAt, quest.metadata);

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

  if (quest.verification_type === "text-submission") {
    const submissionData = normalizeTextSubmission(payload, submittedAt);

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
      action: "submitted a text response",
      detail: `${quest.title} is waiting for review`,
      questId,
      questTitle: quest.title,
    });

    return {
      completion,
      outcome: "pending" as const,
      progressUpdate: null,
      message: "Text submission sent for review.",
    };
  }

  if (quest.verification_type === "api-check") {
    const config = parseApiQuestVerificationConfig(quest.metadata);
    if (!config) {
      throw new Error("API verification quests require a valid apiVerification config.");
    }

    const verificationResult = await executeApiQuestVerification({
      config,
      quest: {
        id: quest.id,
        title: quest.title,
        verificationType: quest.verification_type,
      },
      user: {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.displayName,
      },
      payload,
      submittedAt,
    });

    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status: verificationResult.status,
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: verificationResult.status === "approved" || verificationResult.status === "rejected" ? currentUser.id : null,
      completedAt: verificationResult.status === "approved" ? submittedAt : null,
      submissionData: verificationResult.submissionData,
    });

    let progressUpdate: QuestProgressUpdate | null = null;
    if (verificationResult.status === "approved") {
      progressUpdate = await applyQuestRewardTransition({
        userId: currentUser.id,
        completionId: completion.id,
        questId,
        questTitle: quest.title,
        questXpReward: quest.xp_reward,
        previousAwardedXp: existingCompletion?.awardedXp ?? 0,
        shouldBeApproved: true,
      });
    } else if (verificationResult.status === "pending") {
      await logQuestActivity({
        userId: currentUser.id,
        actor: currentUser.displayName,
        actionType: "quest-submitted",
        action: "submitted a quest",
        detail: `${quest.title} is waiting for review`,
        questId,
        questTitle: quest.title,
      });
    } else {
      await logQuestActivity({
        userId: currentUser.id,
        actor: currentUser.displayName,
        actionType: "quest-rejected",
        action: "failed an external verification",
        detail: `${quest.title} did not pass the external verification`,
        questId,
        questTitle: quest.title,
      });
    }

    return {
      completion,
      outcome: verificationResult.status,
      progressUpdate,
      message: verificationResult.message,
    };
  }

  if (quest.verification_type === "wallet-check") {
    const linkedWallets = await findWalletIdentityDetailsForUser(currentUser.id);
    const walletVerification = resolveWalletQuestVerification({
      linkedWallets,
      selectedWalletAddress: payload.walletAddress,
      metadata: quest.metadata,
    });

    const completion = await upsertQuestCompletionForUser({
      userId: currentUser.id,
      questId,
      status: "approved",
      awardedXp: existingCompletion?.awardedXp ?? 0,
      reviewedBy: currentUser.id,
      completedAt: submittedAt,
      submissionData: {
        walletAddress: walletVerification.walletAddress,
        linkedAt: walletVerification.linkedAt,
        walletAgeDays: walletVerification.walletAgeDays,
        walletCheckMode: String(quest.metadata.walletCheckMode ?? "linked-wallet-ownership"),
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
      message: "Linked wallet verified for this quest.",
    };
  }

  throw new Error(`Verification type ${quest.verification_type} is not supported yet.`);
}

export async function listPendingQuestReviews(): Promise<ReviewQueueItem[]> {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return getPendingReviewQueue();
}

export async function listRecentQuestReviews(): Promise<ReviewHistoryItem[]> {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return getRecentReviewHistory();
}

export async function listReviewerWorkload() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return getReviewerWorkload();
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
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  const existingCompletion = await getPendingReviewQueue().then((queue) =>
    queue.find((item) => item.id === completionId) ?? null,
  );

  const nextSubmissionData = existingCompletion
    ? mergeModerationIntoSubmission(
        existingCompletion.submissionData,
        moderationNote,
        new Date().toISOString(),
      )
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

export async function bulkReviewQuestSubmissions({
  completionIds,
  action,
  moderationNote,
}: {
  completionIds: string[];
  action: "approved" | "rejected";
  moderationNote?: string;
}) {
  const uniqueCompletionIds = Array.from(new Set(completionIds));

  if (uniqueCompletionIds.length > 20) {
    throw new Error("Bulk review is limited to 20 submissions at a time.");
  }

  const outcomes = [];
  const failures = [];

  for (const completionId of uniqueCompletionIds) {
    try {
      const result = await reviewQuestSubmission({
        completionId,
        action,
        moderationNote,
      });

      outcomes.push({
        completionId,
        progressUpdate: result.progressUpdate,
      });
    } catch (error) {
      failures.push({
        completionId,
        error: error instanceof Error ? error.message : "Unable to review submission.",
      });
    }
  }

  return {
    reviewedCount: outcomes.length,
    failedCount: failures.length,
    outcomes,
    failures,
  };
}

export async function resolveApiQuestVerificationCallback({
  questId,
  completionId,
  approved,
  callbackToken,
  message,
  verifierResponse,
}: {
  questId: string;
  completionId: string;
  approved: boolean;
  callbackToken: string;
  message?: string;
  verifierResponse?: Record<string, unknown>;
}) {
  const [quest, completion] = await Promise.all([
    getQuestDefinitionById(questId),
    getQuestCompletionById(completionId),
  ]);

  if (!quest || quest.verification_type !== "api-check") {
    throw new Error("API-check quest not found.");
  }

  if (!completion || completion.questId !== questId) {
    throw new Error("Quest completion not found.");
  }

  if (completion.status !== "pending") {
    throw new Error("Only pending API-check completions can be resolved by callback.");
  }

  const config = parseApiQuestVerificationConfig(quest.metadata);
  if (!config || !config.callbackToken) {
    throw new Error("This quest does not accept asynchronous verification callbacks.");
  }

  if (config.callbackToken !== callbackToken.trim()) {
    throw new Error("Invalid verification callback token.");
  }

  const callbackAt = new Date().toISOString();
  const nextSubmissionData = mergeApiVerificationCallbackSubmission({
    submissionData: completion.submissionData,
    approved,
    callbackAt,
    verifierResponse,
    callbackMessage: message,
  });

  const updatedCompletion = await updateQuestCompletionReview({
    completionId,
    reviewerId: null,
    status: approved ? "approved" : "rejected",
    submissionData: nextSubmissionData,
  });

  if (!updatedCompletion) {
    throw new Error("Quest completion not found.");
  }

  const progressUpdate = await applyQuestRewardTransition({
    userId: updatedCompletion.userId,
    completionId: updatedCompletion.id,
    questId: updatedCompletion.questId,
    questTitle: quest.title,
    questXpReward: quest.xp_reward,
    previousAwardedXp: updatedCompletion.awardedXp,
    shouldBeApproved: approved,
  });

  if (!approved) {
    const reviewedUser = await getUserProgressById(updatedCompletion.userId);

    if (reviewedUser) {
      await logQuestActivity({
        userId: updatedCompletion.userId,
        actor: reviewedUser.display_name,
        actionType: "quest-rejected",
        action: "failed an external verification",
        detail: `${quest.title} did not pass the external verification callback`,
        questId: updatedCompletion.questId,
        questTitle: quest.title,
      });
    }
  }

  return {
    completion: updatedCompletion,
    progressUpdate,
  };
}
