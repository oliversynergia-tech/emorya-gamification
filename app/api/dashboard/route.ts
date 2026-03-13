import { NextResponse } from "next/server";

import { resolveCurrentUser } from "@/server/auth/current-user";
import { getDashboardData } from "@/server/repositories/platform-repository";
import { isDatabaseEnabled } from "@/server/repositories/platform-repository-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await resolveCurrentUser();
    const data = await getDashboardData(currentUser);

    return NextResponse.json({
      ok: true,
      source: isDatabaseEnabled() ? "postgresql" : "unavailable",
      currentUser,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
    const status = message.includes("DATABASE_URL") ? 503 : 500;

    return NextResponse.json(
      {
        ok: false,
        source: "postgresql",
        error: message,
      },
      { status },
    );
  }
}
