import type { QueryResultRow } from "pg";

import type { ProfileData, SubscriptionTier } from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { findWalletAddressesForUser } from "@/server/repositories/auth-repository";

type ProfileRow = QueryResultRow & {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  attribution_source: string | null;
  subscription_tier: SubscriptionTier;
  referral_code: string;
};

export async function getProfileByUserId(userId: string): Promise<ProfileData | null> {
  const result = await runQuery<ProfileRow>(
    `SELECT id, email, display_name, avatar_url, attribution_source, subscription_tier, referral_code
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const walletAddresses = await findWalletAddressesForUser(userId);

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    attributionSource: row.attribution_source,
    subscriptionTier: row.subscription_tier,
    referralCode: row.referral_code,
    walletAddresses,
  };
}

export async function updateProfileByUserId({
  userId,
  displayName,
  avatarUrl,
  attributionSource,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  attributionSource: string | null;
}) {
  await runQuery(
    `UPDATE users
     SET display_name = $2,
         avatar_url = $3,
         attribution_source = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, displayName, avatarUrl, attributionSource],
  );

  return getProfileByUserId(userId);
}
