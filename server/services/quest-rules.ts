import type { CompletionStatus, ManualReviewSubmission } from "../../lib/types.ts";

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
): ManualReviewSubmission {
  const contentUrl = normalizeText(payload.contentUrl);
  const screenshotUrl = normalizeText(payload.screenshotUrl);
  const proofFileUrl = normalizeText(payload.proofFileUrl);
  const proofFileName = normalizeText(payload.proofFileName);
  const proofFileType = normalizeText(payload.proofFileType);
  const platform = normalizeText(payload.platform);
  const note = normalizeText(payload.note);

  if (!contentUrl) {
    throw new Error("Manual review quests require a content URL.");
  }

  return {
    contentUrl,
    screenshotUrl: screenshotUrl || null,
    proofFileUrl: proofFileUrl || null,
    proofFileName: proofFileName || null,
    proofFileType: proofFileType || null,
    platform: platform || null,
    note: note || null,
    submittedAt,
  };
}

export function mergeModerationIntoSubmission(
  submissionData: Record<string, string | number | boolean | null>,
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
    submittedAt:
      typeof submissionData.submittedAt === "string" ? submissionData.submittedAt : moderatedAt,
    moderationNote: normalizeText(moderationNote) || null,
    moderatedAt,
  };
}
