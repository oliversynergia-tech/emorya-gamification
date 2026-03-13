import { NextResponse } from "next/server";

import { reviewQuestSubmission } from "@/server/services/quest-service";

type RouteContext = {
  params: Promise<{
    completionId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { completionId } = await context.params;
    const body = (await request.json()) as { action?: "approved" | "rejected"; moderationNote?: string };

    if (body.action !== "approved" && body.action !== "rejected") {
      return NextResponse.json({ ok: false, error: "Action must be approved or rejected." }, { status: 400 });
    }

    const result = await reviewQuestSubmission({
      completionId,
      action: body.action,
      moderationNote: body.moderationNote,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review submission.";
    const status = message.includes("signed in")
      ? 401
      : message.includes("Admin access")
        ? 403
        : message.includes("not found")
          ? 404
          : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
