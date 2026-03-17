import { NextResponse } from "next/server";

import { runCampaignPackCreateRoute } from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runCampaignPackCreateRoute(
    {
      label: typeof body.label === "string" ? body.label : undefined,
    },
    {
      createCampaignPack: adminService.createCampaignPack,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
