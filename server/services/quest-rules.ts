import type {
  CompletionStatus,
  ManualReviewSubmission,
  QuestTaskSubmission,
  TextSubmission,
} from "../../lib/types.ts";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function evaluateQuizSubmission({
  answersCorrect,
  totalQuestions,
  passScore,
}: {
  answersCorrect: unknown;
  totalQuestions: number;
  passScore: number;
}): {
  answersCorrect: number;
  totalQuestions: number;
  passScore: number;
  status: CompletionStatus;
} {
  const normalizedAnswers = normalizeNumber(answersCorrect);

  if (
    !Number.isInteger(normalizedAnswers) ||
    normalizedAnswers < 0 ||
    normalizedAnswers > totalQuestions
  ) {
    throw new Error(`Quiz submissions must include answersCorrect between 0 and ${totalQuestions}.`);
  }

  return {
    answersCorrect: normalizedAnswers,
    totalQuestions,
    passScore,
    status: normalizedAnswers >= passScore ? "approved" : "rejected",
  };
}

export function normalizeManualReviewSubmission(
  payload: Record<string, unknown>,
  submittedAt: string,
  metadata?: Record<string, unknown>,
): ManualReviewSubmission {
  const contentUrl = normalizeText(payload.contentUrl);
  const screenshotUrl = normalizeText(payload.screenshotUrl);
  const proofFileUrl = normalizeText(payload.proofFileUrl);
  const proofFileName = normalizeText(payload.proofFileName);
  const proofFileType = normalizeText(payload.proofFileType);
  const platform = normalizeText(payload.platform);
  const note = normalizeText(payload.note);
  const taskSubmissions = normalizeTaskSubmissions(payload.taskSubmissions);
  const requiredTaskCount = countRequiredTaskBlocks(metadata);

  if (!contentUrl && taskSubmissions.length === 0) {
    throw new Error("Manual review quests require a content URL.");
  }

  if (requiredTaskCount > 0 && taskSubmissions.length < requiredTaskCount) {
    throw new Error("Complete all required quest tasks before submitting for review.");
  }

  return {
    contentUrl,
    screenshotUrl: screenshotUrl || null,
    proofFileUrl: proofFileUrl || null,
    proofFileName: proofFileName || null,
    proofFileType: proofFileType || null,
    platform: platform || null,
    note: note || null,
    taskSubmissions: taskSubmissions.length > 0 ? taskSubmissions : undefined,
    submittedAt,
  };
}

function normalizeTaskSubmissions(value: unknown): QuestTaskSubmission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<QuestTaskSubmission[]>((taskSubmissions, rawSubmission) => {
    if (!rawSubmission || typeof rawSubmission !== "object") {
      return taskSubmissions;
    }

    const submission = rawSubmission as Record<string, unknown>;
    const taskId = normalizeText(submission.taskId);
    const contentUrl = normalizeText(submission.contentUrl);
    const note = normalizeText(submission.note);
    const proofFileUrl = normalizeText(submission.proofFileUrl);
    const proofFileName = normalizeText(submission.proofFileName);
    const proofFileType = normalizeText(submission.proofFileType);

    if (!taskId || (!contentUrl && !note && !proofFileUrl)) {
      return taskSubmissions;
    }

    taskSubmissions.push({
      taskId,
      contentUrl: contentUrl || null,
      note: note || null,
      proofFileUrl: proofFileUrl || null,
      proofFileName: proofFileName || null,
      proofFileType: proofFileType || null,
    });

    return taskSubmissions;
  }, []);
}

function countRequiredTaskBlocks(metadata?: Record<string, unknown>) {
  if (!metadata || !Array.isArray(metadata.taskBlocks)) {
    return 0;
  }

  return metadata.taskBlocks.reduce((count, rawTask) => {
    if (!rawTask || typeof rawTask !== "object") {
      return count;
    }

    const task = rawTask as Record<string, unknown>;
    const label = typeof task.label === "string" ? task.label.trim() : "";
    if (!label) {
      return count;
    }

    return count + (task.required === false ? 0 : 1);
  }, 0);
}

export function mergeModerationIntoSubmission(
  submissionData: Record<string, unknown>,
  moderationNote: string | undefined,
  moderatedAt: string,
): ManualReviewSubmission {
  return {
    contentUrl: typeof submissionData.contentUrl === "string" ? submissionData.contentUrl : "",
    screenshotUrl:
      typeof submissionData.screenshotUrl === "string" ? submissionData.screenshotUrl : null,
    proofFileUrl:
      typeof submissionData.proofFileUrl === "string" ? submissionData.proofFileUrl : null,
    proofFileName:
      typeof submissionData.proofFileName === "string" ? submissionData.proofFileName : null,
    proofFileType:
      typeof submissionData.proofFileType === "string" ? submissionData.proofFileType : null,
    platform: typeof submissionData.platform === "string" ? submissionData.platform : null,
    note: typeof submissionData.note === "string" ? submissionData.note : null,
    taskSubmissions: Array.isArray(submissionData.taskSubmissions)
      ? (submissionData.taskSubmissions as QuestTaskSubmission[])
      : undefined,
    submittedAt:
      typeof submissionData.submittedAt === "string" ? submissionData.submittedAt : moderatedAt,
    moderationNote: normalizeText(moderationNote) || null,
    moderatedAt,
  };
}

export function normalizeTextSubmission(
  payload: Record<string, unknown>,
  submittedAt: string,
): TextSubmission {
  const response = normalizeText(payload.response);
  const referenceUrl = normalizeText(payload.referenceUrl);
  const platform = normalizeText(payload.platform);

  if (!response) {
    throw new Error("Text submission quests require a written response.");
  }

  return {
    response,
    referenceUrl: referenceUrl || null,
    platform: platform || null,
    submittedAt,
  };
}
