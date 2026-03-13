import type { AppRole, AuthSession, AuthUser } from "@/lib/types";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { userHasRole } from "@/server/repositories/admin-repository";

async function userHasAnyRole(userId: string, roles: AppRole[]) {
  for (const role of roles) {
    if (await userHasRole(userId, role)) {
      return true;
    }
  }

  return false;
}

export async function isAdminUser(user: Pick<AuthUser, "id"> | null | undefined): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  return userHasAnyRole(user.id, ["super_admin", "admin"]);
}

export async function isSuperAdminUser(user: Pick<AuthUser, "id"> | null | undefined): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  return userHasRole(user.id, "super_admin");
}

export async function assertAdminUser(user: AuthUser | null | undefined): Promise<void> {
  if (!user) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (!(await isAdminUser(user))) {
    throw new Error("Admin access is required for this action.");
  }
}

export async function assertSuperAdminUser(user: AuthUser | null | undefined): Promise<void> {
  if (!user) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (!(await isSuperAdminUser(user))) {
    throw new Error("Super admin access is required for this action.");
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
