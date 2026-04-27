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
