import { NextResponse } from "next/server";

import { resolveCurrentUser } from "@/server/auth/current-user";
import { getDashboardData } from "@/server/repositories/platform-repository";
import { isDatabaseEnabled } from "@/server/repositories/platform-repository-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await resolveCurrentUser();
  const data = await getDashboardData(currentUser);

  return NextResponse.json({
    ok: true,
    source: isDatabaseEnabled() ? "postgresql" : "mock-fallback",
    currentUser,
    data,
  });
}
