import type { AuthSession, AuthUser } from "@/lib/types";
import { getAdminEmailAllowlist } from "@/lib/config";
import { resolveCurrentSession } from "@/server/auth/current-user";

export function isAdminUser(user: Pick<AuthUser, "email"> | null | undefined): boolean {
  if (!user?.email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();

  return allowlist.includes(user.email.trim().toLowerCase());
}

export function assertAdminUser(
  user: AuthUser | null | undefined,
): asserts user is AuthUser & { email: string } {
  if (!user) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (!isAdminUser(user)) {
    throw new Error("Admin access is required for this action.");
  }
}

export async function requireAdminSession(): Promise<AuthSession> {
  const session = await resolveCurrentSession();

  if (!session) {
    throw new Error("You must be signed in to access admin controls.");
  }

  assertAdminUser(session.user);
  return session;
}
