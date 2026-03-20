import { createActivityLogEntry } from "@/server/repositories/progression-repository";
import { getAuthenticatedUser } from "@/server/services/auth-service";

export async function trackCampaignEvent({
  packId,
  eventType,
  ctaLabel,
  ctaVariant,
  href,
  notificationId,
  notificationStatus,
  notificationUntil,
  reminderVariant,
  reminderSchedule,
}: {
  packId: string;
  eventType: string;
  ctaLabel: string;
  ctaVariant?: string;
  href: string;
  notificationId?: string;
  notificationStatus?: "handled" | "snoozed";
  notificationUntil?: string | null;
  reminderVariant?: string | null;
  reminderSchedule?: "today" | "this_week" | "wait_for_unlock" | null;
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to track campaign events.");
  }

  const actionType =
    eventType === "mission_inbox_state"
      ? "campaign-mission-inbox-state"
      : eventType.includes("submit")
        ? "campaign-quest-submit-attempt"
        : "campaign-cta-click";
  const actionLabel =
    eventType === "mission_inbox_state"
      ? "updated mission inbox state"
      : eventType.includes("submit")
        ? "attempted mission quest submission"
        : "clicked mission CTA";

  await createActivityLogEntry({
    userId: currentUser.id,
    actionType,
    xpEarned: 0,
    metadata: {
      actor: currentUser.displayName,
      action: actionLabel,
      detail: `${ctaLabel} (${eventType})`,
      packId,
      eventType,
      href,
      ctaLabel,
      ctaVariant: ctaVariant ?? null,
      notificationId: notificationId ?? null,
      notificationStatus: notificationStatus ?? null,
      notificationUntil: notificationUntil ?? null,
      reminderVariant: reminderVariant ?? null,
      reminderSchedule: reminderSchedule ?? null,
    },
  });
}
