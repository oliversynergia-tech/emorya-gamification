import { NextResponse } from "next/server";

import {
  runQuestDefinitionTemplateCreateRoute,
  runQuestDefinitionTemplateDirectoryRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runQuestDefinitionTemplateDirectoryRoute({
    getQuestDefinitionTemplateDirectory: adminService.getQuestDefinitionTemplateDirectory,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runQuestDefinitionTemplateCreateRoute(body, {
    createQuestDefinitionTemplate: adminService.createQuestDefinitionTemplate,
  });

  return NextResponse.json(result.body, { status: result.status });
}
