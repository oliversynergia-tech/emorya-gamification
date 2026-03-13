import type { AdminOverviewData, AuthUser, DashboardData } from "@/lib/types";
import {
  getAdminOverviewDataFromDb,
  getDashboardDataFromDb,
  isDatabaseEnabled,
} from "@/server/repositories/platform-repository-db";

function assertDatabaseEnabled() {
  if (!isDatabaseEnabled()) {
    throw new Error("DATABASE_URL is required for dashboard and admin data.");
  }
}

function wrapPlatformError(error: unknown, area: "dashboard" | "admin"): never {
  const message = error instanceof Error ? error.message : `Unable to load ${area} data.`;
  throw new Error(`PostgreSQL ${area} load failed: ${message}`);
}

export async function getDashboardData(currentUser?: AuthUser | null): Promise<DashboardData> {
  assertDatabaseEnabled();

  try {
    return await getDashboardDataFromDb(currentUser);
  } catch (error) {
    wrapPlatformError(error, "dashboard");
  }
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  assertDatabaseEnabled();

  try {
    return await getAdminOverviewDataFromDb();
  } catch (error) {
    wrapPlatformError(error, "admin");
  }
}
