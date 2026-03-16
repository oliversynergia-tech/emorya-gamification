import { NextResponse } from "next/server";

import {
  runRewardProgramDirectoryRoute,
  runRewardProgramSaveRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runRewardProgramDirectoryRoute({
    getRewardProgramDirectory: adminService.getRewardProgramDirectory,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runRewardProgramSaveRoute({ body }, {
    saveRewardProgram: adminService.saveRewardProgram,
  });

  return NextResponse.json(result.body, { status: result.status });
}
