import { NextResponse } from "next/server";

import { handleApiQuestVerificationCallbackRequest } from "@/server/http/quest-handlers";
import { resolveApiQuestVerificationCallback } from "@/server/services/quest-service";

type RouteContext = {
  params: Promise<{
    questId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const body = (await request.json()) as {
    completionId?: string;
    approved?: boolean;
    message?: string;
    verifierResponse?: Record<string, unknown>;
  };
  const callbackToken = request.headers.get("x-quest-callback-token") ?? "";

  const result = await handleApiQuestVerificationCallbackRequest(
    {
      questId,
      body,
      callbackToken,
    },
    resolveApiQuestVerificationCallback,
  );

  return NextResponse.json(result.body, { status: result.status });
}
