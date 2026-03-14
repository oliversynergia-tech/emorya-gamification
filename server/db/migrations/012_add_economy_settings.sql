CREATE TABLE IF NOT EXISTS economy_settings (
  id UUID PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  payout_asset TEXT NOT NULL CHECK (payout_asset IN ('EMR', 'EGLD', 'PARTNER')),
  redemption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  direct_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_annual_referral_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_premium_flash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_ambassador_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_eligibility_points INTEGER NOT NULL DEFAULT 100,
  points_per_token INTEGER NOT NULL DEFAULT 20,
  xp_multiplier_free NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  xp_multiplier_monthly NUMERIC(6, 2) NOT NULL DEFAULT 1.25,
  xp_multiplier_annual NUMERIC(6, 2) NOT NULL DEFAULT 1.50,
  token_multiplier_free NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  token_multiplier_monthly NUMERIC(6, 2) NOT NULL DEFAULT 1.15,
  token_multiplier_annual NUMERIC(6, 2) NOT NULL DEFAULT 1.30,
  referral_signup_base_xp INTEGER NOT NULL DEFAULT 40,
  referral_monthly_conversion_base_xp INTEGER NOT NULL DEFAULT 150,
  referral_annual_conversion_base_xp INTEGER NOT NULL DEFAULT 300,
  annual_referral_direct_token_amount NUMERIC(18, 4) NOT NULL DEFAULT 25.0000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS economy_settings_audit (
  id UUID PRIMARY KEY,
  settings_id UUID NOT NULL REFERENCES economy_settings(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  previous_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  next_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_economy_settings_active_single
  ON economy_settings(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_economy_settings_audit_created_at
  ON economy_settings_audit(created_at DESC);
