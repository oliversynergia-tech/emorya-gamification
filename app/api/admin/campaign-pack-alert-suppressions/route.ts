import { NextResponse } from "next/server";

import { handleCampaignPackAlertSuppressionRequest } from "@/server/http/admin-handlers";
import { suppressCampaignPackAlert } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    packId?: string;
    label?: string;
    title?: string;
    hours?: number;
    reason?: string | null;
  };
  const result = await handleCampaignPackAlertSuppressionRequest(body, suppressCampaignPackAlert);

  return NextResponse.json(result.body, { status: result.status });
}
