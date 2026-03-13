import { NextResponse } from "next/server";

import { handleReviewQueueRequest } from "@/server/http/quest-handlers";
import { listPendingQuestReviews } from "@/server/services/quest-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleReviewQueueRequest(listPendingQuestReviews);

  return NextResponse.json(result.body, { status: result.status });
}
