import { NextResponse } from "next/server";

import {
  handleQuestDefinitionCreateRequest,
  handleQuestDefinitionDirectoryRequest,
} from "@/server/http/admin-handlers";
import {
  createQuestDefinition,
  getQuestDefinitionDirectory,
} from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleQuestDefinitionDirectoryRequest(getQuestDefinitionDirectory);

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await handleQuestDefinitionCreateRequest(body, createQuestDefinition);

  return NextResponse.json(result.body, { status: result.status });
}
