import { NextResponse } from "next/server";

import {
  handleQuestDefinitionDeleteRequest,
  handleQuestDefinitionUpdateRequest,
} from "@/server/http/admin-handlers";
import {
  deleteQuestDefinition,
  updateQuestDefinition,
} from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    questId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await handleQuestDefinitionUpdateRequest({ questId, body }, updateQuestDefinition);

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const result = await handleQuestDefinitionDeleteRequest(questId, deleteQuestDefinition);

  return NextResponse.json(result.body, { status: result.status });
}
