ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS campaign_pack_benchmarks JSONB NOT NULL DEFAULT '{}'::JSONB;
