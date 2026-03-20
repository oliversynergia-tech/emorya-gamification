import { createActivityLogEntry } from "@/server/repositories/progression-repository";
import { getAuthenticatedUser } from "@/server/services/auth-service";

export async function trackCampaignEvent({
  packId,
  eventType,
  ctaLabel,
  ctaVariant,
  href,
}: {
  packId: string;
  eventType: string;
  ctaLabel: string;
  ctaVariant?: string;
  href: string;
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to track campaign events.");
  }

  const actionType = eventType.includes("submit") ? "campaign-quest-submit-attempt" : "campaign-cta-click";
  const actionLabel = eventType.includes("submit") ? "attempted mission quest submission" : "clicked mission CTA";

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
    },
  });
}
