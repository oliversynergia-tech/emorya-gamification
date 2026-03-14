import { NextResponse } from "next/server";

import { handleModerationNotificationAcknowledgeRequest } from "@/server/http/admin-handlers";
import { acknowledgeModerationNotification } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ deliveryId: string }> },
) {
  const { deliveryId } = await params;
  const result = await handleModerationNotificationAcknowledgeRequest(
    deliveryId,
    acknowledgeModerationNotification,
  );

  return NextResponse.json(result.body, { status: result.status });
}
