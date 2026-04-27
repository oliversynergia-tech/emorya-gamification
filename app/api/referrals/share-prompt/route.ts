import { NextResponse } from "next/server";

import { resolveCurrentUser } from "@/server/auth/current-user";
import { markReferralSharePromptedForUser } from "@/server/services/referral-share-prompt-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const currentUser = await resolveCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      referralId?: unknown;
    };

    const referralId = typeof body.referralId === "string" ? body.referralId.trim() : "";

    if (!referralId) {
      return NextResponse.json({ ok: false, error: "referralId is required." }, { status: 400 });
    }

    const updated = await markReferralSharePromptedForUser({
      referralId,
      userId: currentUser.id,
    });

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update referral share prompt.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
