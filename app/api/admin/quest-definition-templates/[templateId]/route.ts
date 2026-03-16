import { NextResponse } from "next/server";

import {
  runQuestDefinitionTemplateDeleteRoute,
  runQuestDefinitionTemplateUpdateRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { templateId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runQuestDefinitionTemplateUpdateRoute(
    { templateId, body },
    { updateQuestDefinitionTemplate: adminService.updateQuestDefinitionTemplate },
  );

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { templateId } = await context.params;
  const result = await runQuestDefinitionTemplateDeleteRoute(templateId, {
    deleteQuestDefinitionTemplate: adminService.deleteQuestDefinitionTemplate,
  });

  return NextResponse.json(result.body, { status: result.status });
}
