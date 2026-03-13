import { NextResponse } from "next/server";

import { handleReviewQueueRequest } from "@/server/http/quest-handlers";
import { bulkReviewQuestSubmissions, listPendingQuestReviews } from "@/server/services/quest-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleReviewQueueRequest(listPendingQuestReviews);

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      completionIds?: string[];
      action?: "approved" | "rejected";
      moderationNote?: string;
    };

    if (!Array.isArray(body.completionIds) || body.completionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "completionIds are required." }, { status: 400 });
    }

    if (body.action !== "approved" && body.action !== "rejected") {
      return NextResponse.json({ ok: false, error: "Action must be approved or rejected." }, { status: 400 });
    }

    const result = await bulkReviewQuestSubmissions({
      completionIds: body.completionIds,
      action: body.action,
      moderationNote: body.moderationNote,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process bulk review.";
    const status = message.includes("signed in")
      ? 401
      : message.includes("Admin access")
        ? 403
        : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
