import { NextResponse } from "next/server";

import {
  handleEconomySettingsRequest,
  handleEconomySettingsUpdateRequest,
} from "@/server/http/admin-handlers";
import { getEconomySettings, saveEconomySettings } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleEconomySettingsRequest(getEconomySettings);

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await handleEconomySettingsUpdateRequest(body, saveEconomySettings);

  return NextResponse.json(result.body, { status: result.status });
}
