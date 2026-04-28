export const supportedLiveQuestVerificationTypes = [
  "wallet-check",
  "quiz",
  "manual-review",
  "link-visit",
  "completion-check",
  "api-check",
  "text-submission",
] as const;

const supportedLiveQuestVerificationTypeSet = new Set<string>(supportedLiveQuestVerificationTypes);

export function isSupportedLiveQuestVerificationType(verificationType: string) {
  return supportedLiveQuestVerificationTypeSet.has(verificationType);
}
