import { hasDatabaseConfig } from "@/lib/config";
import { runQuery } from "@/server/db/client";

export type ShareProfile = {
  displayName: string;
  level: number;
  currentStreak: number;
  referralCode: string;
  profileUrl: string;
};

export async function getShareProfileForUser(userId: string): Promise<ShareProfile | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const result = await runQuery<{
    display_name: string | null;
    level: number | string;
    current_streak: number | string;
    referral_code: string;
  }>(
    `SELECT display_name, level, current_streak, referral_code
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://gravity.emorya.com").replace(/\/$/, "");

  return {
    displayName: row.display_name?.trim() || "Community member",
    level: Number(row.level),
    currentStreak: Number(row.current_streak),
    referralCode: row.referral_code,
    profileUrl: `${appUrl}/u/${row.referral_code}`,
  };
}
