import type { AuthSession, AuthUser } from "@/lib/types";
import { clearSessionCookie, generateSessionToken, getSessionExpiryDate, hashSessionToken, readSessionCookie, setSessionCookie } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/passwords";
import { createEmailUser, createSession, deleteSessionByTokenHash, findSessionByTokenHash, findUserByEmail, findUserBySessionTokenHash } from "@/server/repositories/auth-repository";

export async function signUpWithEmail({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new Error("An account already exists for that email.");
  }

  const user = await createEmailUser({
    email,
    displayName,
    passwordHash: hashPassword(password),
  });

  await issueSessionForUser(user.id);

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    subscriptionTier: user.subscription_tier,
  };
}

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error("Invalid email or password.");
  }

  await issueSessionForUser(user.id);

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    subscriptionTier: user.subscription_tier,
  };
}

export async function signOutCurrentSession() {
  const sessionToken = await readSessionCookie();

  if (sessionToken) {
    await deleteSessionByTokenHash(hashSessionToken(sessionToken));
  }

  await clearSessionCookie();
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const sessionToken = await readSessionCookie();

  if (!sessionToken) {
    return null;
  }

  return findUserBySessionTokenHash(hashSessionToken(sessionToken));
}

export async function getAuthenticatedSession(): Promise<AuthSession | null> {
  const sessionToken = await readSessionCookie();

  if (!sessionToken) {
    return null;
  }

  return findSessionByTokenHash(hashSessionToken(sessionToken));
}

async function issueSessionForUser(userId: string) {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiryDate();

  await createSession({
    userId,
    sessionTokenHash: hashSessionToken(sessionToken),
    expiresAt,
  });

  await setSessionCookie(sessionToken, expiresAt);
}
