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
          body.action === "approve" || body.action === "processing" || body.action === "settle"
            ? body.action
            : undefined,
        receiptReference: typeof body.receiptReference === "string" ? body.receiptReference : undefined,
        settlementNote: typeof body.settlementNote === "string" ? body.settlementNote : null,
      },
    },
    {
      transitionPendingTokenRedemption: adminService.transitionPendingTokenRedemption,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
