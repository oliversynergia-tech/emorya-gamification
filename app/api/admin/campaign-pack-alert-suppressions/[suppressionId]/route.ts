import { NextResponse } from "next/server";

import { handleCampaignPackAlertSuppressionClearRequest } from "@/server/http/admin-handlers";
import { clearCampaignPackAlertSuppressionById } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ suppressionId: string }> },
) {
  const { suppressionId } = await params;
  const result = await handleCampaignPackAlertSuppressionClearRequest(
    suppressionId,
    clearCampaignPackAlertSuppressionById,
  );

  return NextResponse.json(result.body, { status: result.status });
}
