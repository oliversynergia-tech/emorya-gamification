import { NextResponse } from "next/server";

import {
  runCampaignPackBenchmarkOverrideClearRoute,
  runCampaignPackBenchmarkOverrideRoute,
} from "@/server/http/admin-route-actions";
import * as adminService from "@/server/services/admin-service";

type RouteContext = {
  params: Promise<{
    packId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: RouteContext) {
  const { packId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const result = await runCampaignPackBenchmarkOverrideRoute(
    {
      packId,
      label: typeof body.label === "string" ? body.label : undefined,
      benchmark:
        body.benchmark && typeof body.benchmark === "object"
          ? {
              walletLinkRateTarget:
                typeof (body.benchmark as Record<string, unknown>).walletLinkRateTarget === "number"
                  ? ((body.benchmark as Record<string, unknown>).walletLinkRateTarget as number)
                  : undefined,
              rewardEligibilityRateTarget:
                typeof (body.benchmark as Record<string, unknown>).rewardEligibilityRateTarget === "number"
                  ? ((body.benchmark as Record<string, unknown>).rewardEligibilityRateTarget as number)
                  : undefined,
              premiumConversionRateTarget:
                typeof (body.benchmark as Record<string, unknown>).premiumConversionRateTarget === "number"
                  ? ((body.benchmark as Record<string, unknown>).premiumConversionRateTarget as number)
                  : undefined,
              retainedActivityRateTarget:
                typeof (body.benchmark as Record<string, unknown>).retainedActivityRateTarget === "number"
                  ? ((body.benchmark as Record<string, unknown>).retainedActivityRateTarget as number)
                  : undefined,
              averageWeeklyXpTarget:
                typeof (body.benchmark as Record<string, unknown>).averageWeeklyXpTarget === "number"
                  ? ((body.benchmark as Record<string, unknown>).averageWeeklyXpTarget as number)
                  : undefined,
              zeroCompletionWeekThreshold:
                typeof (body.benchmark as Record<string, unknown>).zeroCompletionWeekThreshold === "number"
                  ? ((body.benchmark as Record<string, unknown>).zeroCompletionWeekThreshold as number)
                  : undefined,
            }
          : undefined,
      reason: typeof body.reason === "string" ? body.reason : null,
    },
    {
      saveCampaignPackBenchmarkOverride: adminService.saveCampaignPackBenchmarkOverride,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { packId } = await context.params;
  const result = await runCampaignPackBenchmarkOverrideClearRoute(
    packId,
    {
      clearCampaignPackBenchmarkOverride: adminService.removeCampaignPackBenchmarkOverride,
    },
  );

  return NextResponse.json(result.body, { status: result.status });
}
