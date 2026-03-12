import type { AuthSession, AuthUser } from "@/lib/types";
import { hasDatabaseConfig } from "@/lib/config";
import { getAuthenticatedSession, getAuthenticatedUser } from "@/server/services/auth-service";

export async function resolveCurrentUser(): Promise<AuthUser | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}

export async function resolveCurrentSession(): Promise<AuthSession | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    return await getAuthenticatedSession();
  } catch {
    return null;
  }
}
