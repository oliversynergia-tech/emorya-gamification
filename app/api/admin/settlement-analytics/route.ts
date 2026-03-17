import { NextResponse } from "next/server";

import { runSettlementAnalyticsRoute } from "@/server/http/admin-route-actions";
import { getSettlementAnalytics } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const compareDaysParam = searchParams.get("compareDays");
  const days = daysParam ? Number(daysParam) : undefined;
  const compareDays = compareDaysParam ? Number(compareDaysParam) : undefined;
  const result = await runSettlementAnalyticsRoute({ days, compareDays }, { getSettlementAnalytics });

  return NextResponse.json(result.body, { status: result.status });
}
