import { NextResponse } from "next/server";

import { handleQuestSubmitRequest } from "@/server/http/quest-handlers";
import { submitQuest } from "@/server/services/quest-service";

type RouteContext = {
  params: Promise<{
    questId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const result = await handleQuestSubmitRequest({ questId, payload }, submitQuest);

  return NextResponse.json(result.body, { status: result.status });
}
