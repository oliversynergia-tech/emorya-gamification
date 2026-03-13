import type { UserJourneyState, UserProgressState } from "@/lib/types";

export function resolveUserJourneyState(state: UserProgressState | null | undefined): UserJourneyState {
  if (!state) {
    return "visitor";
  }

  if (state.ambassadorActive) {
    return "ambassador";
  }

  if (state.ambassadorCandidate) {
    return "ambassador_candidate";
  }

  if (state.subscriptionTier === "annual") {
    return "annual_premium";
  }

  if (state.subscriptionTier === "monthly") {
    return "monthly_premium";
  }

  if (state.rewardEligible) {
    return "reward_eligible_free";
  }

  if (state.starterPathComplete) {
    return "activated_free";
  }

  return "signed_up_free";
}
