import { supportedSocialPlatforms, validateSocialHandle } from "./social-platforms.ts";
import type { SocialConnectionState } from "./types.ts";

export function normalizeSocialConnectionsForProfileUpdate(connections: SocialConnectionState[]) {
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
      verified: false,
      connectedAt: null,
    };
  });
}
