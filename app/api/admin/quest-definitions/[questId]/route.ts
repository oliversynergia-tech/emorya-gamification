import { NextResponse } from "next/server";

import {
  runQuestDefinitionDeleteRoute,
  runQuestDefinitionUpdateRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    questId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runQuestDefinitionUpdateRoute(
    { questId, body },
    { updateQuestDefinition: adminService.updateQuestDefinition },
  );

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { questId } = await context.params;
  const result = await runQuestDefinitionDeleteRoute(questId, {
    deleteQuestDefinition: adminService.deleteQuestDefinition,
  });

  return NextResponse.json(result.body, { status: result.status });
}
