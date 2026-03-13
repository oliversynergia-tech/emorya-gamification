import { NextResponse } from "next/server";

import { getRoleDirectory, updateReviewerRole } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getRoleDirectory();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load role directory.";
    const status = message.includes("signed in")
      ? 401
      : message.includes("Admin access")
        ? 403
        : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      reviewerEnabled?: boolean;
    };

    if (!body.userId || typeof body.reviewerEnabled !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "userId and reviewerEnabled are required." },
        { status: 400 },
      );
    }

    const users = await updateReviewerRole({
      userId: body.userId,
      enabled: body.reviewerEnabled,
    });

    return NextResponse.json({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update reviewer roles.";
    const status = message.includes("signed in")
      ? 401
      : message.includes("Admin access")
        ? 403
        : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
