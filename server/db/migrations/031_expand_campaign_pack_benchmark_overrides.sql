ALTER TABLE campaign_pack_benchmark_overrides
  ADD COLUMN IF NOT EXISTS retained_activity_rate_target NUMERIC(6, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zero_completion_week_threshold INTEGER NOT NULL DEFAULT 1;
