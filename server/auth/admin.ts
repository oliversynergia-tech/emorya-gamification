import type { AuthSession, AuthUser } from "@/lib/types";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { userHasRole } from "@/server/repositories/admin-repository";

export async function isAdminUser(user: Pick<AuthUser, "id"> | null | undefined): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  return userHasRole(user.id, "admin");
}

export async function assertAdminUser(user: AuthUser | null | undefined): Promise<void> {
  if (!user) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (!(await isAdminUser(user))) {
    throw new Error("Admin access is required for this action.");
  }
}

export async function requireAdminSession(): Promise<AuthSession> {
  const session = await resolveCurrentSession();

  if (!session) {
    throw new Error("You must be signed in to access admin controls.");
  }

  await assertAdminUser(session.user);
  return session;
}
