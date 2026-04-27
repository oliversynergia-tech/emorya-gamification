import { getSharePreset, type ShareData } from "@/lib/share-presets";
import { getPendingReferralSignupSharePrompt, markReferralSharePrompted } from "@/server/repositories/referral-repository";
import { getQuestRuntimeContext } from "@/server/repositories/runtime-flag-repository";

export async function getPendingReferralSignupSharePromptForUser({
  userId,
  displayName,
  profileUrl,
}: {
  userId: string;
  displayName: string;
  profileUrl: string;
}): Promise<ShareData | null> {
  const runtimeContext = await getQuestRuntimeContext();

  if (!runtimeContext.milestone_share_enabled) {
    return null;
  }

  const referralId = await getPendingReferralSignupSharePrompt(userId);

  if (!referralId) {
    return null;
  }

  return {
    ...getSharePreset("referral_signup", displayName, profileUrl),
    referralPromptId: referralId,
  };
}

export async function markReferralSharePromptedForUser({
  referralId,
  userId,
}: {
  referralId: string;
  userId: string;
}) {
  return markReferralSharePrompted({
    referralId,
    referrerUserId: userId,
  });
}
