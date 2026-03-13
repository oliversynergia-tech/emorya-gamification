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
