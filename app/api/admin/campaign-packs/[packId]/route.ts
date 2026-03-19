import { NextResponse } from "next/server";

import { runCampaignPackLifecycleRoute } from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    packId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { packId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runCampaignPackLifecycleRoute(
    {
      packId,
      lifecycleState:
        body.lifecycleState === "draft" || body.lifecycleState === "ready" || body.lifecycleState === "live"
          ? body.lifecycleState
          : undefined,
    },
    {
      updateCampaignPackLifecycle: adminService.updateCampaignPackLifecycle,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
