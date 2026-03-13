import { NextResponse } from "next/server";

import { handleReviewPatchRequest } from "@/server/http/quest-handlers";
import { reviewQuestSubmission } from "@/server/services/quest-service";

type RouteContext = {
  params: Promise<{
    completionId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { completionId } = await context.params;
  const body = (await request.json()) as { action?: "approved" | "rejected"; moderationNote?: string };
  const result = await handleReviewPatchRequest({ completionId, body }, reviewQuestSubmission);

  return NextResponse.json(result.body, { status: result.status });
}
