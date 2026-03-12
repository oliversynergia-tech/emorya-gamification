import { NextResponse } from "next/server";

import { getCurrentProfile, updateCurrentProfile } from "@/server/services/profile-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      displayName?: string;
      avatarUrl?: string | null;
      attributionSource?: string | null;
    };

    const displayName = body.displayName?.trim();
    const avatarUrl = body.avatarUrl?.trim() || null;
    const attributionSource = body.attributionSource?.trim() || null;

    if (!displayName) {
      return NextResponse.json(
        { ok: false, error: "Display name is required." },
        { status: 400 },
      );
    }

    const profile = await updateCurrentProfile({
      displayName,
      avatarUrl,
      attributionSource,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile.";
    const status = message.includes("signed in") ? 401 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
