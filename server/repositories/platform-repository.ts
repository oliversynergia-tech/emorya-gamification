import { achievements, activityFeed, adminStats, currentUser as mockCurrentUser, leaderboard, premiumMoments, quests, reviewQueue } from "@/lib/mock-data";
import type { AdminOverviewData, AuthUser, DashboardData } from "@/lib/types";
import {
  getAdminOverviewDataFromDb,
  getDashboardDataFromDb,
  isDatabaseEnabled,
} from "@/server/repositories/platform-repository-db";

export async function getDashboardData(currentUser?: AuthUser | null): Promise<DashboardData> {
  if (isDatabaseEnabled()) {
    try {
      return await getDashboardDataFromDb(currentUser);
    } catch {
      // Keep builds and unprovisioned environments working even when DATABASE_URL exists
      // but the process cannot reach Postgres.
    }
  }

  return {
    user: mockCurrentUser,
    quests,
    achievements,
    leaderboard,
    activityFeed,
    premiumMoments,
  };
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  if (isDatabaseEnabled()) {
    try {
      return await getAdminOverviewDataFromDb();
    } catch {
      // Same fallback behavior as the dashboard overview.
    }
  }

  return {
    stats: adminStats,
    reviewQueue,
  };
}
