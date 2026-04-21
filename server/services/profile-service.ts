import { normalizeSocialConnectionsForProfileUpdate } from "@/lib/profile-update-policy";
import type { ProfileData, SocialConnectionState } from "@/lib/types";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { getProfileByUserId, updateProfileByUserId } from "@/server/repositories/profile-repository";

function normalizeUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    throw new Error("Avatar URL must be a valid absolute URL.");
  }
}

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
  socialConnections,
}: {
  displayName: string;
  avatarUrl: string | null;
  socialConnections: SocialConnectionState[];
}) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error("You must be signed in to update your profile.");
  }

  return updateProfileByUserId({
    userId: currentUser.id,
    displayName: displayName.trim(),
    avatarUrl: normalizeUrl(avatarUrl),
    socialConnections: normalizeSocialConnectionsForProfileUpdate(socialConnections),
  });
}
