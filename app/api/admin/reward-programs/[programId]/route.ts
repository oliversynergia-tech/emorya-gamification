import { NextResponse } from "next/server";

import { runRewardProgramSaveRoute } from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    programId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { programId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runRewardProgramSaveRoute(
    { programId, body },
    { saveRewardProgram: adminService.saveRewardProgram },
  );

  return NextResponse.json(result.body, { status: result.status });
}
