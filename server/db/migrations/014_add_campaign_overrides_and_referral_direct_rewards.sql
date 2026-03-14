ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS campaign_overrides JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS annual_direct_token_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_direct_token_rewarded_at TIMESTAMPTZ;
