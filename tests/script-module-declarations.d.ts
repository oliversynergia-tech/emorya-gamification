declare module "../scripts/db-tools.mjs" {
  export const supportedDbCommands: readonly string[];
  export const dbToolUsage: string;
}

declare module "../scripts/quest-definition-validator.mjs" {
  export function validateQuestDefinitionRow(row: {
    slug?: unknown;
    xp_reward?: unknown;
    xpReward?: unknown;
    verification_type?: unknown;
    metadata?: unknown;
  }): string[];

  export function validateQuestDefinitionRows(
    rows: Array<{
      slug?: unknown;
      xp_reward?: unknown;
      xpReward?: unknown;
      verification_type?: unknown;
      metadata?: unknown;
    }>,
  ): string[];
}
