import { supportedSocialPlatforms, validateSocialHandle } from "@/lib/social-platforms";
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

function normalizeSocialConnections(connections: SocialConnectionState[]) {
  const supported = new Set(supportedSocialPlatforms);
  const seen = new Set<string>();

  return connections.map((connection) => {
    if (!supported.has(connection.platform as (typeof supportedSocialPlatforms)[number])) {
      throw new Error(`Unsupported social platform: ${connection.platform}`);
    }

    if (seen.has(connection.platform)) {
      throw new Error(`Duplicate social platform: ${connection.platform}`);
    }

    seen.add(connection.platform);

    const { normalized, error } = validateSocialHandle(
      connection.platform as (typeof supportedSocialPlatforms)[number],
      connection.handle,
    );

    if (error) {
      throw new Error(error);
    }

    return {
      platform: connection.platform,
      handle: normalized,
      verified: Boolean(connection.verified),
      connectedAt: connection.verified ? connection.connectedAt ?? new Date().toISOString() : null,
    };
  });
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
  attributionSource,
  socialConnections,
}: {
  displayName: string;
  avatarUrl: string | null;
  attributionSource: string | null;
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
    attributionSource: attributionSource?.trim() || null,
    socialConnections: normalizeSocialConnections(socialConnections),
  });
}
