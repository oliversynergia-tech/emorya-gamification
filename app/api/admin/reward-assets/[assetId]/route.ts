import { NextResponse } from "next/server";

import { runRewardAssetSaveRoute } from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runRewardAssetSaveRoute(
    { assetId, body },
    { saveRewardAsset: adminService.saveRewardAsset },
  );

  return NextResponse.json(result.body, { status: result.status });
}
