import type { AuthUser } from "@/lib/types";

import { getAdminOverviewData, getDashboardData } from "@/server/repositories/platform-repository";

export async function loadDashboardOverview(currentUser?: AuthUser | null) {
  return getDashboardData(currentUser);
}

export async function loadAdminOverview() {
  return getAdminOverviewData();
}
