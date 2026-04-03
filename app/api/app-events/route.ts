import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/server/services/auth-service";
import { processAppEvent } from "@/server/services/app-event-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "You must be signed in to send app events." }, { status: 401 });
    }

    const body = (await request.json()) as {
      eventType?: string;
      occurredAt?: string | null;
      metadata?: Record<string, unknown>;
    };

    const eventType = body.eventType?.trim();

    if (!eventType) {
      return NextResponse.json({ ok: false, error: "Missing app event type." }, { status: 400 });
    }

    const result = await processAppEvent({
      userId: currentUser.id,
      actor: currentUser.displayName,
      eventType,
      occurredAt: body.occurredAt ?? null,
      metadata: body.metadata,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process app event.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
