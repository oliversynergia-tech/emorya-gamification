CREATE TABLE IF NOT EXISTS reward_assets (
  id UUID PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  icon_url TEXT,
  issuer_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_partner_asset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_programs (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  reward_asset_id UUID NOT NULL REFERENCES reward_assets(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  redemption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  direct_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  referral_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  premium_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ambassador_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_eligibility_points INTEGER NOT NULL DEFAULT 100,
  points_per_token INTEGER NOT NULL DEFAULT 20,
  notes TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE token_redemptions
  ADD COLUMN IF NOT EXISTS reward_asset_id UUID,
  ADD COLUMN IF NOT EXISTS reward_program_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_redemptions_reward_asset_id_fkey'
      AND table_name = 'token_redemptions'
  ) THEN
    ALTER TABLE token_redemptions
      ADD CONSTRAINT token_redemptions_reward_asset_id_fkey
      FOREIGN KEY (reward_asset_id) REFERENCES reward_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_redemptions_reward_program_id_fkey'
      AND table_name = 'token_redemptions'
  ) THEN
    ALTER TABLE token_redemptions
      ADD CONSTRAINT token_redemptions_reward_program_id_fkey
      FOREIGN KEY (reward_program_id) REFERENCES reward_programs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reward_assets_active ON reward_assets(is_active, symbol);
CREATE INDEX IF NOT EXISTS idx_reward_programs_active ON reward_programs(is_active, slug);
