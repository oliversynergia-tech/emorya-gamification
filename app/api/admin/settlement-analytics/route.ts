import { NextResponse } from "next/server";

import { runSettlementAnalyticsRoute } from "@/server/http/admin-route-actions";
import { getSettlementAnalytics } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = daysParam ? Number(daysParam) : undefined;
  const result = await runSettlementAnalyticsRoute({ days }, { getSettlementAnalytics });

  return NextResponse.json(result.body, { status: result.status });
}
