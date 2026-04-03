import {
  activationPathCompletionQuestSlug,
  activationPathPrerequisiteQuestSlugs,
} from "./progression-rules.ts";

export const APP_EVENT_QUEST_MAP = {
  app_download_confirmed: ["download-the-emorya-app"],
  app_opened_first_time: ["open-the-app-for-the-first-time"],
  account_created: ["create-emorya-account"],
  profile_completed: ["complete-your-profile"],
  starter_setup_completed: ["confirm-your-starter-setup"],
  daily_wheel_completed: ["complete-daily-wheel-spin"],
  adventure_game_session_completed: ["play-emoryan-adventure-game"],
  xportal_download_confirmed: ["download-xportal"],
  xportal_wallet_ready: ["open-or-create-your-xportal-wallet"],
  wallet_connected: ["connect-your-xportal-wallet"],
  reward_path_viewed: ["view-your-emrs-reward-path"],
  first_calorie_conversion_completed: ["convert-your-first-calories"],
} as const;

export type SupportedAppEvent = keyof typeof APP_EVENT_QUEST_MAP;

export function isSupportedAppEvent(event: string): event is SupportedAppEvent {
  return Object.prototype.hasOwnProperty.call(APP_EVENT_QUEST_MAP, event);
}

export function getQuestSlugsForAppEvent(eventType: string) {
  return isSupportedAppEvent(eventType) ? [...APP_EVENT_QUEST_MAP[eventType]] : [];
}

export function shouldDeriveActivationCompletion(completedQuestSlugs: string[]) {
  if (completedQuestSlugs.includes(activationPathCompletionQuestSlug)) {
    return false;
  }

  return activationPathPrerequisiteQuestSlugs.every((slug) => completedQuestSlugs.includes(slug));
}
