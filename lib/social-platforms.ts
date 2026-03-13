export const supportedSocialPlatforms = [
  "X",
  "Telegram",
  "Discord",
  "TikTok",
  "Instagram",
  "CoinMarketCap",
] as const;

export type SupportedSocialPlatform = (typeof supportedSocialPlatforms)[number];

export const defaultConnectionRewards: Record<SupportedSocialPlatform, number> = {
  X: 15,
  Telegram: 15,
  Discord: 15,
  TikTok: 20,
  Instagram: 20,
  CoinMarketCap: 20,
};

export const socialPlatformMeta: Record<
  SupportedSocialPlatform,
  {
    placeholder: string;
    hint: string;
  }
> = {
  X: {
    placeholder: "@handle",
    hint: "Use your public X handle, with or without the @.",
  },
  Telegram: {
    placeholder: "@username",
    hint: "Telegram usernames cannot contain spaces.",
  },
  Discord: {
    placeholder: "username or username#1234",
    hint: "Use the Discord name moderators should look for.",
  },
  TikTok: {
    placeholder: "@creatorname",
    hint: "Use the public TikTok handle shown on your profile.",
  },
  Instagram: {
    placeholder: "@creatorname",
    hint: "Use the public Instagram username, not a profile URL.",
  },
  CoinMarketCap: {
    placeholder: "coinmarketcap-user",
    hint: "Use the visible CoinMarketCap community username.",
  },
};

export function normalizeSocialHandle(platform: SupportedSocialPlatform, handle: string | null) {
  const trimmed = handle?.trim() || null;

  if (!trimmed) {
    return null;
  }

  if (["X", "Telegram", "TikTok", "Instagram"].includes(platform)) {
    return trimmed.replace(/^@+/, "@");
  }

  return trimmed;
}

export function validateSocialHandle(platform: SupportedSocialPlatform, handle: string | null) {
  const normalized = normalizeSocialHandle(platform, handle);

  if (!normalized) {
    return { normalized: null, error: null };
  }

  if (normalized.length > 60) {
    return {
      normalized,
      error: `${platform} handle must be 60 characters or fewer.`,
    };
  }

  if (/\s/.test(normalized) && platform !== "Discord") {
    return {
      normalized,
      error: `${platform} handle cannot contain spaces.`,
    };
  }

  return { normalized, error: null };
}
