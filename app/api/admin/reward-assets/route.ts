import { NextResponse } from "next/server";

import {
  runRewardAssetDirectoryRoute,
  runRewardAssetSaveRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runRewardAssetDirectoryRoute({
    getRewardAssetDirectory: adminService.getRewardAssetDirectory,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runRewardAssetSaveRoute({ body }, {
    saveRewardAsset: adminService.saveRewardAsset,
  });

  return NextResponse.json(result.body, { status: result.status });
}
