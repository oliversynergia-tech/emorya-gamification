CREATE TYPE subscription_tier AS ENUM ('free', 'monthly', 'annual');
CREATE TYPE auth_provider AS ENUM ('email', 'multiversx');
CREATE TYPE identity_status AS ENUM ('active', 'pending', 'revoked');
CREATE TYPE quest_category AS ENUM ('social', 'learn', 'app', 'staking', 'creative', 'referral', 'limited');
CREATE TYPE verification_type AS ENUM (
  'social-oauth',
  'wallet-check',
  'quiz',
  'manual-review',
  'link-visit',
  'text-submission'
);
CREATE TYPE quest_recurrence AS ENUM ('one-time', 'daily', 'weekly');
CREATE TYPE completion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'reviewer');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  attribution_source TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_identities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_subject TEXT NOT NULL,
  status identity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subject)
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE wallet_link_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  challenge_message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  UNIQUE (user_id, wallet_address, nonce)
);

CREATE TABLE social_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  UNIQUE (user_id, platform)
);

CREATE TABLE quest_definitions (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category quest_category NOT NULL,
  xp_reward INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  verification_type verification_type NOT NULL,
  recurrence quest_recurrence NOT NULL DEFAULT 'one-time',
  required_tier subscription_tier NOT NULL DEFAULT 'free',
  required_level INTEGER NOT NULL DEFAULT 1,
  is_premium_preview BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quest_definition_templates (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  form_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quest_completions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  status completion_status NOT NULL DEFAULT 'pending',
  submission_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  awarded_xp INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_id)
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress NUMERIC(5, 2) NOT NULL DEFAULT 0,
  earned_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  signup_reward_xp INTEGER NOT NULL DEFAULT 0,
  conversion_reward_xp INTEGER NOT NULL DEFAULT 0,
  annual_direct_token_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
  signup_rewarded_at TIMESTAMPTZ,
  conversion_rewarded_at TIMESTAMPTZ,
  annual_direct_token_rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_user_id, referee_user_id)
);

CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'all-time', 'referral')),
  xp INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  UNIQUE (user_id, period, snapshot_date)
);

CREATE TABLE ugc_submissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quest_definitions(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'featured', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE token_redemptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL CHECK (asset IN ('EMR', 'EGLD', 'PARTNER')),
  reward_asset_id UUID,
  reward_program_id UUID,
  eligibility_points_spent INTEGER NOT NULL DEFAULT 0,
  token_amount NUMERIC(18, 4) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('claimed', 'settled')),
  workflow_state TEXT NOT NULL DEFAULT 'queued' CHECK (workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled')),
  source TEXT NOT NULL DEFAULT 'xp-conversion',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  processing_started_at TIMESTAMPTZ,
  processing_by UUID REFERENCES users(id),
  held_at TIMESTAMPTZ,
  held_by UUID REFERENCES users(id),
  hold_reason TEXT,
  failed_at TIMESTAMPTZ,
  failed_by UUID REFERENCES users(id),
  last_error TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES users(id),
  receipt_reference TEXT,
  settlement_note TEXT
);

CREATE TABLE reward_assets (
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

CREATE TABLE reward_programs (
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
  ADD CONSTRAINT token_redemptions_reward_asset_id_fkey
  FOREIGN KEY (reward_asset_id) REFERENCES reward_assets(id) ON DELETE SET NULL;

ALTER TABLE token_redemptions
  ADD CONSTRAINT token_redemptions_reward_program_id_fkey
  FOREIGN KEY (reward_program_id) REFERENCES reward_programs(id) ON DELETE SET NULL;

CREATE TABLE moderation_notification_deliveries (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('inbox', 'webhook', 'email', 'slack', 'discord')),
  event_status TEXT NOT NULL CHECK (event_status IN ('armed', 'sent', 'acknowledged')),
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_pack_alert_deliveries (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('inbox', 'webhook', 'email', 'slack', 'discord')),
  event_status TEXT NOT NULL CHECK (event_status IN ('armed', 'sent')),
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE economy_settings (
  id UUID PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  payout_asset TEXT NOT NULL CHECK (payout_asset IN ('EMR', 'EGLD', 'PARTNER')),
  payout_mode TEXT NOT NULL DEFAULT 'manual' CHECK (payout_mode IN ('manual', 'review_required', 'automation_ready')),
  redemption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  settlement_processing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_reward_queue_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  settlement_notes_required BOOLEAN NOT NULL DEFAULT FALSE,
  direct_rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_annual_referral_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_premium_flash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  direct_ambassador_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  differentiate_upstream_campaign_sources BOOLEAN NOT NULL DEFAULT FALSE,
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
  campaign_pack_benchmarks JSONB NOT NULL DEFAULT '{}'::JSONB,
  campaign_overrides JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE economy_settings_audit (
  id UUID PRIMARY KEY,
  settings_id UUID NOT NULL REFERENCES economy_settings(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  previous_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  next_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE token_redemption_audit (
  id UUID PRIMARY KEY,
  redemption_id UUID NOT NULL REFERENCES token_redemptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'processing', 'settle', 'hold', 'fail', 'requeue', 'cancel')),
  changed_by UUID REFERENCES users(id),
  previous_workflow_state TEXT NOT NULL CHECK (previous_workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled')),
  next_workflow_state TEXT NOT NULL CHECK (next_workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled')),
  receipt_reference TEXT,
  settlement_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id, expires_at DESC);
CREATE INDEX idx_user_roles_role ON user_roles(role, created_at DESC);
CREATE INDEX idx_wallet_link_challenges_user_id ON wallet_link_challenges(user_id, created_at DESC);
CREATE INDEX idx_quest_definitions_category ON quest_definitions(category);
CREATE INDEX idx_quest_definition_templates_active ON quest_definition_templates(is_active, created_at DESC);
CREATE INDEX idx_quest_completions_status ON quest_completions(status);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_leaderboard_snapshots_period_rank ON leaderboard_snapshots(period, rank);
CREATE INDEX idx_token_redemptions_user_id ON token_redemptions(user_id, created_at DESC);
CREATE INDEX idx_reward_assets_active ON reward_assets(is_active, symbol);
CREATE INDEX idx_reward_programs_active ON reward_programs(is_active, slug);
CREATE INDEX idx_moderation_notification_deliveries_created_at ON moderation_notification_deliveries(created_at DESC);
CREATE INDEX idx_campaign_pack_alert_deliveries_created_at ON campaign_pack_alert_deliveries(created_at DESC);
CREATE INDEX idx_campaign_pack_alert_deliveries_fingerprint ON campaign_pack_alert_deliveries(channel, event_status, fingerprint);
CREATE UNIQUE INDEX idx_economy_settings_active_single ON economy_settings(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_economy_settings_audit_created_at ON economy_settings_audit(created_at DESC);
CREATE INDEX idx_token_redemption_audit_created_at ON token_redemption_audit(created_at DESC);
