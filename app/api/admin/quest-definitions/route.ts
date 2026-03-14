import { NextResponse } from "next/server";

import {
  runQuestDefinitionCreateRoute,
  runQuestDefinitionDirectoryRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runQuestDefinitionDirectoryRoute({
    getQuestDefinitionDirectory: adminService.getQuestDefinitionDirectory,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runQuestDefinitionCreateRoute(body, {
    createQuestDefinition: adminService.createQuestDefinition,
  });

  return NextResponse.json(result.body, { status: result.status });
}
