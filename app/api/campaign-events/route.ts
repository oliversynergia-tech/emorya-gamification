import { NextResponse } from "next/server";

import { trackCampaignEvent } from "@/server/services/campaign-event-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      packId?: string;
      eventType?: string;
      ctaLabel?: string;
      ctaVariant?: string;
      href?: string;
      notificationId?: string;
      notificationStatus?: "handled" | "snoozed";
      notificationUntil?: string | null;
      reminderVariant?: string | null;
    };

    const packId = body.packId?.trim();
    const eventType = body.eventType?.trim();
    const ctaLabel = body.ctaLabel?.trim();
    const ctaVariant = body.ctaVariant?.trim();
    const href = body.href?.trim();
    const notificationId = body.notificationId?.trim();
    const notificationStatus = body.notificationStatus;
    const notificationUntil = body.notificationUntil?.trim() ?? null;
    const reminderVariant = body.reminderVariant?.trim() ?? null;

    if (!packId || !eventType || !ctaLabel || !href) {
      return NextResponse.json({ ok: false, error: "Missing campaign event fields." }, { status: 400 });
    }

    await trackCampaignEvent({
      packId,
      eventType,
      ctaLabel,
      ctaVariant,
      href,
      notificationId,
      notificationStatus,
      notificationUntil,
      reminderVariant,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to track campaign event.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
