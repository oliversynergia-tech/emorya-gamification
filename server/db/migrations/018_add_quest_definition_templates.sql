CREATE TABLE IF NOT EXISTS quest_definition_templates (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  form_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_definition_templates_active
  ON quest_definition_templates(is_active, created_at DESC);
