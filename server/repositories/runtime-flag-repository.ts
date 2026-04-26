import { createDefaultQuestRuntimeContext } from "@/lib/progression-rules";
import type { QuestRuntimeContext } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type RuntimeFlagKey = "flashRewardDay" | "referralBoostWeek" | "milestone_share_enabled";

type RuntimeFlagRow = {
  flag_key: RuntimeFlagKey | string;
  enabled: boolean;
};

const supportedRuntimeFlags = new Set<RuntimeFlagKey>([
  "flashRewardDay",
  "referralBoostWeek",
  "milestone_share_enabled",
]);

export async function getQuestRuntimeContext(now = new Date()): Promise<QuestRuntimeContext> {
  const defaults = createDefaultQuestRuntimeContext(now);
  let result;

  try {
    result = await runQuery<RuntimeFlagRow>(
      `SELECT flag_key, enabled
       FROM runtime_flags`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42P01"
    ) {
      return defaults;
    }

    throw error;
  }

  for (const row of result.rows) {
    if (supportedRuntimeFlags.has(row.flag_key as RuntimeFlagKey)) {
      const flagKey = row.flag_key as RuntimeFlagKey;
      defaults[flagKey] = row.enabled;
    }
  }

  return defaults;
}
