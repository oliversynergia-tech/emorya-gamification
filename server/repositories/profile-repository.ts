import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import { supportedSocialPlatforms } from "@/lib/social-platforms";
import type { ProfileData, SocialConnectionState, SubscriptionTier } from "@/lib/types";
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

type SocialConnectionRow = QueryResultRow & {
  platform: string;
  handle: string | null;
  verified: boolean;
  connected_at: string | null;
};

async function getSocialConnectionsByUserId(userId: string): Promise<SocialConnectionState[]> {
  const result = await runQuery<SocialConnectionRow>(
    `SELECT platform, handle, verified, connected_at
     FROM social_connections
     WHERE user_id = $1
     ORDER BY platform ASC`,
    [userId],
  );

  const byPlatform = new Map(
    result.rows.map((row) => [
      row.platform,
      {
        platform: row.platform,
        handle: row.handle,
        verified: row.verified,
        connectedAt: row.connected_at,
      },
    ]),
  );

  return supportedSocialPlatforms.map((platform) => (
    byPlatform.get(platform) ?? {
      platform,
      handle: null,
      verified: false,
      connectedAt: null,
    }
  ));
}

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

  const [walletAddresses, socialConnections] = await Promise.all([
    findWalletAddressesForUser(userId),
    getSocialConnectionsByUserId(userId),
  ]);

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    attributionSource: row.attribution_source,
    subscriptionTier: row.subscription_tier,
    referralCode: row.referral_code,
    walletAddresses,
    socialConnections,
  };
}

export async function updateProfileByUserId({
  userId,
  displayName,
  avatarUrl,
  socialConnections,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  socialConnections: SocialConnectionState[];
}) {
  await runQuery(
    `UPDATE users
     SET display_name = $2,
         avatar_url = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, displayName, avatarUrl],
  );

  for (const connection of socialConnections) {
    await runQuery(
      `INSERT INTO social_connections (id, user_id, platform, handle, verified, connected_at)
       VALUES ($4, $1, $2, $3, FALSE, NULL)
       ON CONFLICT (user_id, platform)
       DO UPDATE SET
         handle = EXCLUDED.handle`,
      [
        userId,
        connection.platform,
        connection.handle,
        randomUUID(),
      ],
    );
  }

  return getProfileByUserId(userId);
}
