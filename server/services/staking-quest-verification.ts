function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type StakingQuestVerificationConfig = {
  mode: "first-stake" | "threshold" | "apy-eligibility" | "hold-duration" | "referred-threshold";
  assetSymbol: string;
  thresholdAmount?: number;
  thresholdLabel?: string;
  requiredHoldDays?: number;
  fallbackMode: "manual-review" | "pending-review";
};

export function parseStakingQuestVerificationConfig(
  metadata: Record<string, unknown>,
): StakingQuestVerificationConfig | null {
  const rawConfig = metadata.stakingVerification;
  if (!rawConfig || typeof rawConfig !== "object") {
    return null;
  }

  const config = rawConfig as Record<string, unknown>;
  const mode = normalizeText(config.mode);
  const normalizedMode =
    mode === "first-stake" ||
    mode === "threshold" ||
    mode === "apy-eligibility" ||
    mode === "hold-duration" ||
    mode === "referred-threshold"
      ? mode
      : null;

  if (!normalizedMode) {
    return null;
  }

  const assetSymbol = normalizeText(config.assetSymbol) || "EMR";
  const thresholdAmount = normalizeNumber(config.thresholdAmount);
  const requiredHoldDays = normalizeNumber(config.requiredHoldDays);
  const thresholdLabel = normalizeText(config.thresholdLabel);
  const fallbackMode =
    normalizeText(config.fallbackMode) === "pending-review" ? "pending-review" : "manual-review";

  return {
    mode: normalizedMode,
    assetSymbol,
    thresholdAmount: thresholdAmount ?? undefined,
    thresholdLabel: thresholdLabel || undefined,
    requiredHoldDays: requiredHoldDays ?? undefined,
    fallbackMode,
  };
}
