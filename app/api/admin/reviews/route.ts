import { NextResponse } from "next/server";

import { handleBulkReviewRequest, handleReviewQueueRequest } from "@/server/http/quest-handlers";
import { bulkReviewQuestSubmissions, listPendingQuestReviews } from "@/server/services/quest-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleReviewQueueRequest(listPendingQuestReviews);

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    completionIds?: string[];
    action?: "approved" | "rejected";
    moderationNote?: string;
    expectedCount?: number;
  };
  const result = await handleBulkReviewRequest(body, bulkReviewQuestSubmissions);

  return NextResponse.json(result.body, { status: result.status });
}
