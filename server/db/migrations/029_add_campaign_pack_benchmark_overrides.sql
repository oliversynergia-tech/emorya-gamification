CREATE TABLE IF NOT EXISTS campaign_pack_benchmark_overrides (
  id UUID PRIMARY KEY,
  pack_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  wallet_link_rate_target NUMERIC(6, 4) NOT NULL,
  reward_eligibility_rate_target NUMERIC(6, 4) NOT NULL,
  premium_conversion_rate_target NUMERIC(6, 4) NOT NULL,
  average_weekly_xp_target INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pack_benchmark_overrides_pack_id
  ON campaign_pack_benchmark_overrides(pack_id);
