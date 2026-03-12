import type { ProfileData } from "@/lib/types";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { getProfileByUserId, updateProfileByUserId } from "@/server/repositories/profile-repository";

export async function getCurrentProfile(): Promise<ProfileData | null> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return null;
  }

  return getProfileByUserId(currentUser.id);
}

export async function updateCurrentProfile({
  displayName,
  avatarUrl,
  attributionSource,
}: {
  displayName: string;
  avatarUrl: string | null;
  attributionSource: string | null;
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to update your profile.");
  }

  return updateProfileByUserId({
    userId: currentUser.id,
    displayName,
    avatarUrl,
    attributionSource,
  });
}
