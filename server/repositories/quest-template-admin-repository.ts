import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { QuestDefinitionTemplateItem } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type QuestDefinitionTemplateRow = QueryResultRow & {
  id: string;
  label: string;
  description: string;
  form_config: QuestDefinitionTemplateItem["form"];
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapQuestDefinitionTemplate(row: QuestDefinitionTemplateRow): QuestDefinitionTemplateItem {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    form: row.form_config,
    metadata: row.metadata ?? {},
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listQuestDefinitionTemplatesForAdmin() {
  const result = await runQuery<QuestDefinitionTemplateRow>(
    `SELECT id, label, description, form_config, metadata, is_active, created_at, updated_at
     FROM quest_definition_templates
     ORDER BY created_at ASC, label ASC`,
  );

  return result.rows.map(mapQuestDefinitionTemplate);
}

export async function createQuestDefinitionTemplateForAdmin(
  input: Omit<QuestDefinitionTemplateItem, "id" | "createdAt" | "updatedAt">,
) {
  const result = await runQuery<QuestDefinitionTemplateRow>(
    `INSERT INTO quest_definition_templates (
       id, label, description, form_config, metadata, is_active
     ) VALUES (
       $1, $2, $3, $4::jsonb, $5::jsonb, $6
     )
     RETURNING id, label, description, form_config, metadata, is_active, created_at, updated_at`,
    [randomUUID(), input.label, input.description, JSON.stringify(input.form), JSON.stringify(input.metadata), input.isActive],
  );

  return mapQuestDefinitionTemplate(result.rows[0]);
}

export async function updateQuestDefinitionTemplateForAdmin(
  templateId: string,
  input: Omit<QuestDefinitionTemplateItem, "id" | "createdAt" | "updatedAt">,
) {
  const result = await runQuery<QuestDefinitionTemplateRow>(
    `UPDATE quest_definition_templates
     SET label = $2,
         description = $3,
         form_config = $4::jsonb,
         metadata = $5::jsonb,
         is_active = $6,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, label, description, form_config, metadata, is_active, created_at, updated_at`,
    [templateId, input.label, input.description, JSON.stringify(input.form), JSON.stringify(input.metadata), input.isActive],
  );

  return result.rows[0] ? mapQuestDefinitionTemplate(result.rows[0]) : null;
}

export async function deleteQuestDefinitionTemplateForAdmin(templateId: string) {
  const result = await runQuery<{ id: string }>(
    `DELETE FROM quest_definition_templates WHERE id = $1 RETURNING id`,
    [templateId],
  );

  return Boolean(result.rows[0]?.id);
}
