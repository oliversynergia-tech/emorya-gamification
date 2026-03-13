import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AuthSession, AuthUser } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type UserRow = QueryResultRow & {
  id: string;
  email: string | null;
  password_hash: string | null;
  display_name: string;
  subscription_tier: AuthUser["subscriptionTier"];
};

type SessionUserRow = QueryResultRow & {
  id: string;
  email: string | null;
  display_name: string;
  subscription_tier: AuthUser["subscriptionTier"];
};

type WalletChallengeRow = QueryResultRow & {
  id: string;
  user_id: string;
  wallet_address: string;
  nonce: string;
  challenge_message: string;
  expires_at: string;
  created_at: string;
};

type IdentityOwnerRow = QueryResultRow & {
  user_id: string;
};

type WalletIdentityRow = QueryResultRow & {
  provider_subject: string;
  created_at?: string;
};

export async function findUserByEmail(email: string) {
  const result = await runQuery<UserRow>(
    `SELECT id, email, password_hash, display_name, subscription_tier
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function createEmailUser({
  email,
  displayName,
  passwordHash,
  referredByUserId,
}: {
  email: string;
  displayName: string;
  passwordHash: string;
  referredByUserId?: string | null;
}) {
  const userId = randomUUID();
  const identityId = randomUUID();
  const referralId = randomUUID();
  const referralCode = `EMORYA-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  const result = await runQuery<UserRow>(
    `WITH inserted_user AS (
       INSERT INTO users (
         id, email, password_hash, display_name, referral_code, referred_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6
       )
       RETURNING id, email, password_hash, display_name, subscription_tier
     ),
     inserted_identity AS (
       INSERT INTO user_identities (
         id, user_id, provider, provider_subject, status
       ) VALUES (
         $7, $1, 'email', $2, 'active'
       )
       RETURNING user_id
     ),
     inserted_referral AS (
       INSERT INTO referrals (
         id, referrer_user_id, referee_user_id
       )
       SELECT $8, $6, $1
       WHERE $6 IS NOT NULL
       ON CONFLICT (referrer_user_id, referee_user_id) DO NOTHING
       RETURNING referee_user_id
     )
     SELECT id, email, password_hash, display_name, subscription_tier
     FROM inserted_user`,
    [userId, email, passwordHash, displayName, referralCode, referredByUserId ?? null, identityId, referralId],
  );

  return result.rows[0];
}

export async function createSession({
  userId,
  sessionTokenHash,
  expiresAt,
}: {
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
}) {
  await runQuery(
    `INSERT INTO user_sessions (
       id, user_id, session_token_hash, expires_at
     ) VALUES (
       $1, $2, $3, $4
     )`,
    [randomUUID(), userId, sessionTokenHash, expiresAt.toISOString()],
  );
}

export async function deleteSessionByTokenHash(sessionTokenHash: string) {
  await runQuery(
    `DELETE FROM user_sessions
     WHERE session_token_hash = $1`,
    [sessionTokenHash],
  );
}

export async function findUserBySessionTokenHash(sessionTokenHash: string): Promise<AuthUser | null> {
  const result = await runQuery<SessionUserRow>(
    `SELECT u.id, u.email, u.display_name, u.subscription_tier
     FROM user_sessions us
     INNER JOIN users u ON u.id = us.user_id
     WHERE us.session_token_hash = $1
       AND us.expires_at > NOW()
     LIMIT 1`,
    [sessionTokenHash],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  await runQuery(
    `UPDATE user_sessions
     SET last_seen_at = NOW()
     WHERE session_token_hash = $1`,
    [sessionTokenHash],
  );

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    subscriptionTier: row.subscription_tier,
  };
}

export async function findWalletAddressesForUser(userId: string) {
  const result = await runQuery<WalletIdentityRow>(
    `SELECT provider_subject
     FROM user_identities
     WHERE user_id = $1
       AND provider = 'multiversx'
       AND status = 'active'
     ORDER BY created_at ASC`,
    [userId],
  );

  return result.rows.map((row) => row.provider_subject);
}

export async function findWalletIdentityDetailsForUser(userId: string) {
  const result = await runQuery<WalletIdentityRow>(
    `SELECT provider_subject, created_at::text
     FROM user_identities
     WHERE user_id = $1
       AND provider = 'multiversx'
       AND status = 'active'
     ORDER BY created_at ASC`,
    [userId],
  );

  return result.rows.map((row) => ({
    walletAddress: row.provider_subject,
    linkedAt: row.created_at ?? new Date().toISOString(),
  }));
}

export async function findSessionByTokenHash(sessionTokenHash: string): Promise<AuthSession | null> {
  const user = await findUserBySessionTokenHash(sessionTokenHash);

  if (!user) {
    return null;
  }

  const walletAddresses = await findWalletAddressesForUser(user.id);

  return {
    user,
    walletAddresses,
  };
}

export async function createWalletLinkChallenge({
  userId,
  walletAddress,
  nonce,
  challengeMessage,
  expiresAt,
}: {
  userId: string;
  walletAddress: string;
  nonce: string;
  challengeMessage: string;
  expiresAt: Date;
}) {
  const result = await runQuery<WalletChallengeRow>(
    `INSERT INTO wallet_link_challenges (
       id, user_id, wallet_address, nonce, challenge_message, expires_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     )
     RETURNING id, user_id, wallet_address, nonce, challenge_message, expires_at, created_at`,
    [randomUUID(), userId, walletAddress, nonce, challengeMessage, expiresAt.toISOString()],
  );

  return result.rows[0];
}

export async function findActiveWalletChallenge({
  challengeId,
  userId,
  walletAddress,
}: {
  challengeId: string;
  userId: string;
  walletAddress: string;
}) {
  const result = await runQuery<WalletChallengeRow>(
    `SELECT id, user_id, wallet_address, nonce, challenge_message, expires_at, created_at
     FROM wallet_link_challenges
     WHERE id = $1
       AND user_id = $2
       AND wallet_address = $3
       AND consumed_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [challengeId, userId, walletAddress],
  );

  return result.rows[0] ?? null;
}

export async function findWalletIdentityOwner(walletAddress: string) {
  const result = await runQuery<IdentityOwnerRow>(
    `SELECT user_id
     FROM user_identities
     WHERE provider = 'multiversx'
       AND provider_subject = $1
       AND status = 'active'
     LIMIT 1`,
    [walletAddress],
  );

  return result.rows[0]?.user_id ?? null;
}

export async function attachWalletIdentity({
  userId,
  walletAddress,
}: {
  userId: string;
  walletAddress: string;
}) {
  await runQuery(
    `INSERT INTO user_identities (
       id, user_id, provider, provider_subject, status
     ) VALUES (
       $1, $2, 'multiversx', $3, 'active'
     )
     ON CONFLICT (provider, provider_subject)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       status = 'active'`,
    [randomUUID(), userId, walletAddress],
  );
}

export async function consumeWalletChallenge(challengeId: string) {
  await runQuery(
    `UPDATE wallet_link_challenges
     SET consumed_at = NOW()
     WHERE id = $1`,
    [challengeId],
  );
}
