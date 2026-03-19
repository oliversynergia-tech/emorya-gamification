import { NextResponse } from "next/server";

import { runTokenSettlementRoute } from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    redemptionId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { redemptionId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runTokenSettlementRoute(
    {
      redemptionId,
      body: {
        action:
          body.action === "approve" ||
          body.action === "processing" ||
          body.action === "settle" ||
          body.action === "hold" ||
          body.action === "fail" ||
          body.action === "requeue" ||
          body.action === "cancel"
            ? body.action
            : undefined,
        receiptReference: typeof body.receiptReference === "string" ? body.receiptReference : undefined,
        settlementNote: typeof body.settlementNote === "string" ? body.settlementNote : undefined,
        automationReceiptReference:
          typeof body.automationReceiptReference === "string" ? body.automationReceiptReference : undefined,
        automationSettlementNote:
          typeof body.automationSettlementNote === "string" ? body.automationSettlementNote : undefined,
        generateAutomationReceiptReference:
          typeof body.generateAutomationReceiptReference === "boolean" ? body.generateAutomationReceiptReference : undefined,
      },
    },
    {
      transitionPendingTokenRedemption: adminService.transitionPendingTokenRedemption,
      saveTokenRedemptionAutomationMetadata: adminService.saveTokenRedemptionAutomationMetadata,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
