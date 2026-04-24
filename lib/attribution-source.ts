import type { CampaignSource } from "./types";

export const supportedAttributionSources = [
  "organic",
  "zealy",
  "galxe",
  "taskon",
  "social",
  "referral",
  "ads",
  "direct",
] as const;

export type AttributionSource = (typeof supportedAttributionSources)[number];

const supportedAttributionSourceSet = new Set<string>(supportedAttributionSources);

export function normalizeAttributionSource(source: string | null | undefined): AttributionSource | null {
  const normalized = source?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  return supportedAttributionSourceSet.has(normalized) ? (normalized as AttributionSource) : null;
}

export function resolveSignupAttributionSource({
  source,
  referralCode,
}: {
  source?: string | null;
  referralCode?: string | null;
}): AttributionSource {
  const normalizedSource = normalizeAttributionSource(source);

  if (normalizedSource) {
    return normalizedSource;
  }

  if (source?.trim()) {
    return "organic";
  }

  if (referralCode?.trim()) {
    return "referral";
  }

  return "organic";
}

export function normalizeCampaignAttributionSource(
  source: string | null | undefined,
): CampaignSource | "direct" | null {
  const normalized = normalizeAttributionSource(source);

  if (!normalized) {
    return null;
  }

  if (normalized === "zealy" || normalized === "galxe" || normalized === "taskon" || normalized === "direct") {
    return normalized;
  }

  return "direct";
}
