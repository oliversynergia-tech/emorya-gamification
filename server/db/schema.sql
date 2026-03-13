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
  signup_rewarded_at TIMESTAMPTZ,
  conversion_rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_user_id, referee_user_id)
);

CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'all-time', 'referral')),
  xp INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  snapshot_date DATE NOT NULL
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

CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id, expires_at DESC);
CREATE INDEX idx_wallet_link_challenges_user_id ON wallet_link_challenges(user_id, created_at DESC);
CREATE INDEX idx_quest_definitions_category ON quest_definitions(category);
CREATE INDEX idx_quest_completions_status ON quest_completions(status);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_leaderboard_snapshots_period_rank ON leaderboard_snapshots(period, rank);
