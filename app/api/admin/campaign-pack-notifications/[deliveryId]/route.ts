import { NextResponse } from "next/server";

import { handleCampaignPackNotificationAcknowledgeRequest } from "@/server/http/admin-handlers";
import { acknowledgeCampaignPackNotification } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ deliveryId: string }> },
) {
  const { deliveryId } = await params;
  const result = await handleCampaignPackNotificationAcknowledgeRequest(
    deliveryId,
    acknowledgeCampaignPackNotification,
  );

  return NextResponse.json(result.body, { status: result.status });
}
