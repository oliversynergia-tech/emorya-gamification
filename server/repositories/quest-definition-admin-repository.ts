import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { QuestDefinitionAdminItem } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type QuestDefinitionAdminRow = QueryResultRow & {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: QuestDefinitionAdminItem["category"];
  difficulty: QuestDefinitionAdminItem["difficulty"];
  verification_type: QuestDefinitionAdminItem["verificationType"];
  recurrence: QuestDefinitionAdminItem["recurrence"];
  required_tier: QuestDefinitionAdminItem["requiredTier"];
  required_level: number;
  xp_reward: number;
  is_premium_preview: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapQuestDefinition(row: QuestDefinitionAdminRow): QuestDefinitionAdminItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    verificationType: row.verification_type,
    recurrence: row.recurrence,
    requiredTier: row.required_tier,
    requiredLevel: row.required_level,
    xpReward: row.xp_reward,
    isPremiumPreview: row.is_premium_preview,
    isActive: row.is_active,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listQuestDefinitionsForAdmin() {
  const result = await runQuery<QuestDefinitionAdminRow>(
    `SELECT id, slug, title, description, category, difficulty, verification_type, recurrence,
            required_tier, required_level, xp_reward, is_premium_preview, is_active, metadata, created_at, updated_at
     FROM quest_definitions
     ORDER BY created_at ASC, title ASC`,
  );

  return result.rows.map(mapQuestDefinition);
}

export async function createQuestDefinitionForAdmin(input: Omit<QuestDefinitionAdminItem, "id" | "createdAt" | "updatedAt">) {
  const result = await runQuery<QuestDefinitionAdminRow>(
    `INSERT INTO quest_definitions (
       id, slug, title, description, category, xp_reward, difficulty, verification_type, recurrence,
       required_tier, required_level, is_premium_preview, is_active, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14::jsonb
     )
     RETURNING id, slug, title, description, category, difficulty, verification_type, recurrence,
               required_tier, required_level, xp_reward, is_premium_preview, is_active, metadata, created_at, updated_at`,
    [
      randomUUID(),
      input.slug,
      input.title,
      input.description,
      input.category,
      input.xpReward,
      input.difficulty,
      input.verificationType,
      input.recurrence,
      input.requiredTier,
      input.requiredLevel,
      input.isPremiumPreview,
      input.isActive,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return mapQuestDefinition(result.rows[0]);
}

export async function updateQuestDefinitionForAdmin(
  questId: string,
  input: Omit<QuestDefinitionAdminItem, "id" | "createdAt" | "updatedAt">,
) {
  const result = await runQuery<QuestDefinitionAdminRow>(
    `UPDATE quest_definitions
     SET slug = $2,
         title = $3,
         description = $4,
         category = $5,
         xp_reward = $6,
         difficulty = $7,
         verification_type = $8,
         recurrence = $9,
         required_tier = $10,
         required_level = $11,
         is_premium_preview = $12,
         is_active = $13,
         metadata = $14::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, slug, title, description, category, difficulty, verification_type, recurrence,
               required_tier, required_level, xp_reward, is_premium_preview, is_active, metadata, created_at, updated_at`,
    [
      questId,
      input.slug,
      input.title,
      input.description,
      input.category,
      input.xpReward,
      input.difficulty,
      input.verificationType,
      input.recurrence,
      input.requiredTier,
      input.requiredLevel,
      input.isPremiumPreview,
      input.isActive,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return result.rows[0] ? mapQuestDefinition(result.rows[0]) : null;
}

export async function deleteQuestDefinitionForAdmin(questId: string) {
  const result = await runQuery<{ id: string }>(
    `DELETE FROM quest_definitions
     WHERE id = $1
     RETURNING id`,
    [questId],
  );

  return Boolean(result.rows[0]?.id);
}

export async function updateCampaignPackLifecycleForAdmin({
  packId,
  lifecycleState,
}: {
  packId: string;
  lifecycleState: "draft" | "ready" | "live";
}) {
  const nextActive = lifecycleState === "live";

  const result = await runQuery<{ id: string }>(
    `UPDATE quest_definitions
     SET is_active = $2,
         metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{campaignPackState}', to_jsonb($3::text), true),
         updated_at = NOW()
     WHERE metadata ->> 'campaignPackId' = $1
     RETURNING id`,
    [packId, nextActive, lifecycleState],
  );

  return result.rows.length;
}
