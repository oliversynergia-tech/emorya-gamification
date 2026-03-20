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

  await createActivityLogEntry({
    userId: currentUser.id,
    actionType: "campaign-cta-click",
    xpEarned: 0,
    metadata: {
      actor: currentUser.displayName,
      action: "clicked mission CTA",
      detail: `${ctaLabel} (${eventType})`,
      packId,
      eventType,
      href,
      ctaLabel,
      ctaVariant: ctaVariant ?? null,
    },
  });
}
